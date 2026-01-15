import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Search } from 'lucide-react';

import SearchModeTooltip from './SearchModeTooltip';
import SearchResultRow from './SearchResultRow';
import ImageEnlarge from '../GraphVisualization/ImageEnlarge';

import { extractKeywords } from '@/weaver/toolkit/utils/s3SlideUtils';
import { markSlidesOnCanvas } from '@/weaver/toolkit/utils/neo4j-setup';

import {
  callMarkSlidesOnCanvas,
  callFindSlideReference,
  callEmbeddings,
  callFetchSimilarSlides,
  callSearchByKeywords
} from '@/weaver/signals/lib/api/apiClient';

import { fetchSlideDataUrl } from '@/weaver/signals/lib/images/fetchSlideDataUrl';
import { logger, ActionTypes, InteractionTypes, InteractionStatus } from '@/weaver/toolkit/utils/logger/logger';

const STORAGE_KEY = 'advancedSearchPanelState';

const saveSearchState = (state) => {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
};
const loadSearchState = () => {
  const raw = sessionStorage.getItem(STORAGE_KEY);
  if (!raw) return {};
  try { return JSON.parse(raw); } catch { return {}; }
};

const AdvancedSearchPanel = ({
  networkRef,
  setShowInitialContainers,
  setStoryPoints,
  storyPoints,
  onClose,
  isActiveTool, 
}) => {
  const initialState = loadSearchState();
  const [searchQuery, setSearchQuery] = useState(initialState.searchQuery || '');
  const [searchType, setSearchType] = useState(initialState.searchType || 'all');
  const [searchMode, setSearchMode] = useState(
    initialState.searchMode ?? sessionStorage.getItem('searchMode') ?? 'keyword'
  );
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState(initialState.searchResults || []);
  const [hasSearched, setHasSearched] = useState(
    initialState.hasSearched || (initialState.searchResults && initialState.searchResults.length > 0)
  );
  const [enlargedObjectId, setEnlargedObjectId] = useState(null);

  useEffect(() => {
    saveSearchState({ searchQuery, searchType, searchMode, searchResults, hasSearched });
  }, [searchQuery, searchType, searchMode, searchResults, hasSearched]);

  useEffect(() => {
    if (isActiveTool && isActiveTool !== 'search') onClose?.();
  }, [isActiveTool, onClose]);

  useEffect(() => {
    if (networkRef?.current) markSlidesOnCanvas(networkRef);
  }, [networkRef]);

  const getSlideOriginalIdsOnCanvas = () =>
    (storyPoints || []).flatMap(sp => (sp.slides || []).map(slide => slide.originalId || slide.id));
  const canvasIds = getSlideOriginalIdsOnCanvas();

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setHasSearched(true);
    try {
      let slides = [];
      if (searchMode === 'vector') {
        const { embedding, embeddings } = await callEmbeddings(searchQuery);
        const vector = embedding || (Array.isArray(embeddings) && embeddings[0]);
        slides = await callFetchSimilarSlides(vector, 10, { searchType, canvasIds });
      } else {
        const keywords = extractKeywords(searchQuery, 5);
        slides = await callSearchByKeywords(keywords.join(' '), 10, { searchType, canvasIds });
      }

      const filtered = slides;
      setSearchResults(filtered.map(s => ({
        id:         s.id,
        object_id:  s.object_id,
        title:      s.title,
        content:    s.content,
        similarity: (s.percentage || s.similarity || 0) / 100,
        type:       s.type
      })));

      await logger.logInteraction(ActionTypes.SEARCH, {
        component: 'AdvancedSearchPanel',
        interaction_type: searchMode === 'vector'
          ? InteractionTypes.SEARCH_SIMILARITY
          : InteractionTypes.SEARCH_KEYWORD,
        status: InteractionStatus.SUCCESS,
        input_data: { query: searchQuery, search_mode: searchMode, search_type: searchType },
        output_data: { returned_ids: filtered.map(s => s.id) },
        metadata: { returned_count: filtered.length }
      });
    } catch (err) {
      console.error('Search error:', err);
      await logger.logInteraction(ActionTypes.SEARCH, {
        component: 'AdvancedSearchPanel',
        status: InteractionStatus.ERROR,
        interaction_type: searchMode === 'vector'
          ? InteractionTypes.SEARCH_SIMILARITY
          : InteractionTypes.SEARCH_KEYWORD,
        input_data: { query: searchQuery, search_mode: searchMode, search_type: searchType },
        metadata: { message: err?.message }
      });
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearchResultClick = async (item) => {
    try {
      await logger.logInteraction(ActionTypes.SEARCH, {
        component: 'SearchResults',
        interaction_type: InteractionTypes.SEARCH_RESULT_SELECT,
        status: InteractionStatus.SUCCESS,
        input_data: { selected_id: item.id, search_type: item.type }
      });

      await callMarkSlidesOnCanvas([item.id]);

      const exists = await callFindSlideReference(item.id);
      if (!exists) {
        console.error(`Slide ${item.id} does not exist in Neo4j`);
        return;
      }

      setShowInitialContainers(false);

      let targetSP = null;
      const sel = networkRef.current?.getSelectedNodes() || [];
      targetSP = storyPoints.find(sp => sel.includes(sp.id));

      if (!targetSP) {
        for (let nodeId of sel) {
          const node = networkRef.current.body.data.nodes.get(nodeId);
          if (node?.group === 'slide' && node.parentId) {
            targetSP = storyPoints.find(sp => sp.id === node.parentId);
            break;
          }
        }
      }

      if (!targetSP) {
        targetSP = storyPoints[storyPoints.length - 1];
        if (!targetSP) {
          const newId = `sp_${Date.now()}`;
          targetSP = { id: newId, description: `New Story Point`, type: 'storypoint', slides: [] };
          setStoryPoints(prev => [...prev, targetSP]);
        }
      }

      setStoryPoints(prev =>
        prev.map(sp => {
          if (sp.id !== targetSP.id) return sp;
          if ((sp.slides || []).some(s => s.id === item.id)) {
            alert('This slide is already pinned to this point');
            return sp;
          }
          return {
            ...sp,
            slides: [
              ...(sp.slides || []),
              {
                id: item.id,
                content: item.content,
                object_id: item.object_id,
                visible: true,
                locked: false,
                percentage: Math.round((item.similarity || 0) * 100),
                title: item.title
              }
            ]
          };
        })
      );

      const nodes = networkRef.current.body.data.nodes;
      const edges = networkRef.current.body.data.edges;
      const visId = `${targetSP.id}_${item.id}`;

      const dataUrl = await fetchSlideDataUrl(item.object_id);

      nodes.add({
        id: visId,
        group: 'slide',
        parentId: targetSP.id,
        shape: 'image',
        image: dataUrl || undefined,
        label: '',
        size: 44,
        title: (item.content || '').substring(0, 100)
      });

      edges.add({
        id: `edge_${visId}_${targetSP.id}`,
        from: visId,
        to: targetSP.id,
        arrows: 'to',
        label: `${Math.round((item.similarity || 0) * 100)}%`
      });

      networkRef.current.redraw();

      await logger.logInteraction(ActionTypes.CONTENT, {
        interaction_type: InteractionTypes.SLIDE_SELECT,
        component: 'AdvancedSearchPanel',
        metadata: {
          slide_id: item.id,
          storypoint_id: targetSP.id,
          source: 'search_click'
        }
      });
      await logger.logInteraction(ActionTypes.VISUALIZATION, {
        interaction_type: InteractionTypes.GRAPH_EDGE_CREATE,
        component: 'AdvancedSearchPanel',
        metadata: {
          from: `${targetSP.id}_${item.id}`,
          to: targetSP.id,
          similarity_pct: Math.round((item.similarity || 0) * 100)
        }
      });
    } catch (err) {
      console.error('Failed to add slide', err);
      alert('Something went worng. Try again');
    }
  };

  const handlePreview = async (result, index) => {
  try {
    await logger.logSlideView(result.id, {
      storypoint_id: 'advanced_search',
      slide_index: index + 1,
      ui_action: 'enlarge_click',
      enlarged: true,
      source: 'AdvancedSearchPanel',
    });
  } catch (e) {
    console.warn('logSlideView failed (AdvancedSearch):', e);
  }
  setEnlargedObjectId(result.object_id);
};

  useEffect(() => {
    const onAnyModalOpen = () => { onClose?.(); };
    window.addEventListener('modal:opened', onAnyModalOpen);
    return () => window.removeEventListener('modal:opened', onAnyModalOpen);
  }, [onClose]);

  return createPortal(
    <div
      className="border max-h-[650px] overflow-y-auto overflow-x-hidden fixed right-24 top-60 bg-white rounded-xl shadow-xl w-96 z-50"
      tabIndex={-1}
    >
      <ImageEnlarge
        objectId={enlargedObjectId}
        isOpen={!!enlargedObjectId}
        onClose={() => setEnlargedObjectId(null)}
      />

      <div className="sticky top-0 z-[100] bg-white shadow-sm px-6 pt-4 pb-4 border-gray-100">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Advanced Search</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="mb-2">
          <input
            type="text"
            placeholder="Enter your search query..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && searchQuery.trim()) handleSearch(); }}
            className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
          />
        </div>
        <div className="flex gap-2 mb-2">
          <select
            value={searchType}
            onChange={e => setSearchType(e.target.value)}
            className="px-3 py-2 border rounded-md w-full"
          >
            <option value="all">All slides</option>
            <option value="stories">Slides on canvas</option>
            <option value="pdfs">Slides from PDF</option>
          </select>
          <select
            value={searchMode}
            onChange={e => {
              setSearchMode(e.target.value);
              sessionStorage.setItem('searchMode', e.target.value);
            }}
            className="px-2 w-60 py-2 border rounded-md"
          >
            <option value="keyword">Keyword</option>
            <option value="vector">Vector</option>
          </select>
          <SearchModeTooltip />
        </div>
        <button
          onClick={handleSearch}
          disabled={isSearching || !searchQuery.trim()}
          className="w-full py-2 bg-green-700 text-white rounded-md hover:bg-green-800
                     disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isSearching ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
              <span>Searching...</span>
            </>
          ) : (
            <span>Search</span>
          )}
        </button>
      </div>

      <div className={`${searchResults.length > 0 && 'space-y-4 px-6 py-4'}`}>
        {hasSearched && !isSearching && searchResults.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-2 text-sm text-red-500 bg-gray-50 border border-gray-200 rounded-md p-4 mt-4">
            <Search className="w-5 h-5 text-gray-400" />
            <span>No matching slides found</span>
          </div>
        )}

        {searchResults.map((result, index) => (
          <SearchResultRow
            key={result.id || result.object_id}
            result={result}
            onRowClick={() => handleSearchResultClick(result)}
            onPreview={() => handlePreview(result, index)}
          />
        ))}
      </div>
    </div>,
    document.body
  );
};

export default AdvancedSearchPanel;
