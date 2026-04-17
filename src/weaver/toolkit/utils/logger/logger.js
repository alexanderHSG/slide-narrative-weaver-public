import { supabase } from '@/weaver/signals/lib/auth/supabaseClient';

const ActionTypes = {
  SESSION: 'SESSION',
  CONSENT: 'CONSENT',
  PDF: 'PDF',
  SEARCH: 'SEARCH',
  VISUALIZATION: 'VISUALIZATION',
  EXPORT: 'EXPORT',
  STORY: 'STORY',
  ERROR: 'ERROR',
  AUTH: 'AUTH',
  CONTENT: 'CONTENT',
  SLIDE: 'SLIDE',
};

const InteractionTypes = {
  SESSION_START: 'SESSION_START',
  WORKSPACE_VIEW_OPEN: 'WORKSPACE_VIEW_OPEN',

  // Visualization / graph state
  GRAPH_STATE_SNAPSHOT: 'GRAPH_STATE_SNAPSHOT',
  GRAPH_LAYOUT_TOGGLE: 'GRAPH_LAYOUT_TOGGLE',
  GRAPH_RESET_VIEW: 'GRAPH_RESET_VIEW',
  GRAPH_ZOOM_ADJUST: 'GRAPH_ZOOM_ADJUST',
  GRAPH_EDGE_CREATE: 'GRAPH_EDGE_CREATE',
  GRAPH_DELETE_STORYPOINTS: 'GRAPH_DELETE_STORYPOINTS',
  GRAPH_DELETE_SLIDES: 'GRAPH_DELETE_SLIDES',
  GRAPH_CANVAS_CLEAR: 'GRAPH_CANVAS_CLEAR',

  // Story point lifecycle
  STORYPOINT_CREATE_OPEN: 'STORYPOINT_CREATE_OPEN',
  STORYPOINT_PREVIEW_OPEN: 'STORYPOINT_PREVIEW_OPEN',
  STORYPOINT_REORDER: 'STORYPOINT_REORDER',
  STORYPOINT_SAVE: 'STORYPOINT_SAVE',
  STORYPOINT_EDIT_MANUAL_CANVAS: 'STORYPOINT_EDIT_MANUAL_CANVAS',
  STORYPOINT_EDIT_MANUAL_OVERVIEW: 'STORYPOINT_EDIT_MANUAL_OVERVIEW',
  STORYPOINT_EDIT_AI: 'STORYPOINT_EDIT_AI',

  STORY_CREATE: 'STORY_CREATE',

  // Slide management
  SLIDE_LOCK: 'SLIDE_LOCK',
  SLIDE_UNLOCK: 'SLIDE_UNLOCK',
  SLIDE_SELECT: 'SLIDE_SELECT',
  SLIDE_DESELECT_ALL: 'SLIDE_DESELECT_ALL',
  SLIDE_VIEW: 'SLIDE_VIEW',
  SLIDE_ASSIGN_BULK: 'SLIDE_ASSIGN_BULK',
  SLIDE_REGENERATE: 'SLIDE_REGENERATE',
  SLIDE_ALTERNATIVE_FETCH: 'SLIDE_ALTERNATIVE_FETCH',
  SLIDE_GENERATE: 'SLIDE_GENERATE',

  // Search & filtering
  SEARCH_PANEL_OPEN: 'SEARCH_PANEL_OPEN',
  SEARCH_KEYWORD: 'SEARCH_KEYWORD',
  SEARCH_SIMILARITY: 'SEARCH_SIMILARITY',
  SEARCH_RESULT_SELECT: 'SEARCH_RESULT_SELECT',

  // Deck browsing
  DECK_FOLDER_SELECT: 'DECK_FOLDER_SELECT',
  DECK_OPEN: 'DECK_OPEN',

  // Misc
  EXPORT_COMPLETE: 'EXPORT_COMPLETE',
  TUTORIAL_COMPLETE: 'TUTORIAL_COMPLETE',
};

const InteractionStatus = {
  SUCCESS: 'SUCCESS',
  ERROR: 'ERROR',
  IN_PROGRESS: 'IN_PROGRESS',
};

const DEFAULT_PROTOTYPE = 'I1';

class Logger {
  constructor() {
    this.prolificId = null;
    this.sessionId = null;
    this.initialized = false;
    this._viewedSlides = new Set();
    this.prototype = DEFAULT_PROTOTYPE;
    this.uiUserId = null;
  }

  setPrototype(proto) {
    if (proto && typeof proto === 'string') this.prototype = proto;
  }

  startInactivityTimer(onExpireCallback) {
    if (this._inactivityTimeout) clearTimeout(this._inactivityTimeout);

    const INACTIVITY_LIMIT_MS = 45 * 60 * 1000;

    const resetTimer = () => {
      clearTimeout(this._inactivityTimeout);
      this._inactivityTimeout = setTimeout(() => {
        console.warn('⏳ Session expired due to inactivity');
        sessionStorage.removeItem('sessionId');
        this.sessionId = null;
        this.initialized = false;
        try { onExpireCallback?.(); } catch {}
      }, INACTIVITY_LIMIT_MS);
    };

    ['mousemove', 'mousedown', 'keypress', 'scroll', 'touchstart'].forEach((event) =>
      window.addEventListener(event, resetTimer)
    );

    resetTimer();
  }

  async initializeWithConsent(prolificId, _userType, proto) {
    if (!prolificId) {
      console.error('❌ Initialization failed: No Prolific ID provided');
      return;
    }

    this.prolificId = prolificId;
    if (proto) this.setPrototype(proto);

    let existingSessionId = sessionStorage.getItem('sessionId') || sessionStorage.getItem('session_id');

    if (!existingSessionId) {
      existingSessionId = `session_${prolificId}_${Date.now()}`;
      sessionStorage.setItem('sessionId', existingSessionId);

      try {
        const { error: insertError } = await supabase
          .from('session_metrics')
          .upsert(
            {
              user_id: prolificId,
              session_id: existingSessionId,
              prototype: this.prototype || DEFAULT_PROTOTYPE,
              canvas_slide_count: 0,
              last_event: 'SESSION_START',
            },
            { onConflict: 'user_id,session_id,prototype' }
          );

        if (insertError && insertError.code !== 'PGRST116') {
          console.error('❌ Failed to create session_metrics entry:', insertError);
        }

        await this.logInteraction(ActionTypes.SESSION, {
          interaction_type: InteractionTypes.SESSION_START,
          component: 'AuthHandler',
          metadata: {
            initiated_at: new Date().toISOString(),
            session_id: existingSessionId,
            prototype: this.prototype || DEFAULT_PROTOTYPE,
          },
        });
      } catch (error) {
        console.error('❌ Error during session initialization:', error);
      }
    }

    this.sessionId = existingSessionId;
    this.initialized = true;
  }

  async logInteraction(
    actionType,
    {
      interaction_type = null,
      status = InteractionStatus.SUCCESS,
      component = null,
      started_at = new Date().toISOString(),
      ended_at = new Date().toISOString(),
      duration_ms = 0,
      input_data = null,
      output_data = null,
      metadata = null,
      error_message = null,
      error_details = null,
    } = {}
  ) {
    if (!this.initialized || !this.prolificId) {
      console.warn('Logger not initialized — skipping:', actionType);
      return;
    }

    if (!Object.values(ActionTypes).includes(actionType)) {
      console.error('Invalid actionType:', actionType);
      return;
    }

    const record = {
      user_id: this.prolificId,
      session_id: this.sessionId,
      action_type: actionType,
      interaction_type,
      status,
      component,
      started_at,
      ended_at,
      duration_ms,
      input_data,
      output_data,
      metadata,
      error_message,
      error_details,
    };

    const { error } = await supabase.from('user_interactions').insert(record);

    if (error) {
      console.error('Supabase insert error:', error);
    }
  }

  async logSlideView(slideId, extraMeta = {}) {
    if (!this.initialized) return;

    const isNew = !this._viewedSlides.has(slideId);
    const isBacktrack = this._viewedSlides.has(slideId);
    this._viewedSlides.add(slideId);

    await this.logInteraction(ActionTypes.CONTENT, {
      interaction_type: InteractionTypes.SLIDE_VIEW,
      component: 'GraphVisualization',
      metadata: { slide_id: slideId, ...extraMeta },
    });

    const { data: m, error: selErr } = await supabase
      .from('session_metrics')
      .select('slide_views, unique_slides, backtrack_count')
      .eq('user_id', this.prolificId)
      .eq('session_id', this.sessionId)
      .eq('prototype', this.prototype || DEFAULT_PROTOTYPE)
      .single();

    if (selErr && selErr.code === 'PGRST116') {
      const { error: insErr } = await supabase.from('session_metrics').insert({
        user_id: this.prolificId,
        session_id: this.sessionId,
        prototype: this.prototype || DEFAULT_PROTOTYPE,
        slide_views: 1,
        unique_slides: isNew ? 1 : 0,
        backtrack_count: isBacktrack ? 1 : 0,
      });
      if (insErr) console.error('session_metrics insert error:', insErr);
    } else if (m) {
      const { slide_views, unique_slides, backtrack_count } = m;
      const { error: updErr } = await supabase
        .from('session_metrics')
        .update({
          slide_views: slide_views + 1,
          unique_slides: unique_slides + (isNew ? 1 : 0),
          backtrack_count: backtrack_count + (isBacktrack ? 1 : 0),
          last_event: 'SLIDE_VIEW',
        })
        .eq('user_id', this.prolificId)
        .eq('session_id', this.sessionId)
        .eq('prototype', this.prototype || DEFAULT_PROTOTYPE);
      if (updErr) console.error('session_metrics update error:', updErr);
    } else if (selErr) {
      console.error('session_metrics select error:', selErr);
    }
  }

  async logCanvasLoad(canvasSlideCount) {
    if (!this.initialized) return;

    const { data: m, error: selErr } = await supabase
      .from('session_metrics')
      .select('slide_views, unique_slides, backtrack_count')
      .eq('user_id', this.prolificId)
      .eq('session_id', this.sessionId)
      .eq('prototype', this.prototype || DEFAULT_PROTOTYPE)
      .single();

    if (selErr && selErr.code === 'PGRST116') {
      const { error: insErr } = await supabase.from('session_metrics').insert({
        user_id: this.prolificId,
        session_id: this.sessionId,
        prototype: this.prototype || DEFAULT_PROTOTYPE,
        slide_views: 0,
        unique_slides: 0,
        backtrack_count: 0,
        canvas_slide_count: canvasSlideCount,
        last_event: 'VISUALIZATION_STATE',
      });
      if (insErr) console.error('session_metrics insert error:', insErr);
    } else if (m) {
      const { error: updErr } = await supabase
        .from('session_metrics')
        .update({
          canvas_slide_count: canvasSlideCount,
          last_event: 'VISUALIZATION_STATE',
        })
        .eq('user_id', this.prolificId)
        .eq('session_id', this.sessionId)
        .eq('prototype', this.prototype || DEFAULT_PROTOTYPE);
      if (updErr) console.error('session_metrics update error:', updErr);
    } else if (selErr) {
      console.error('session_metrics select error:', selErr);
    }
  }

  logError(err, component = null) {
    return this.logInteraction(ActionTypes.ERROR, {
      status: InteractionStatus.ERROR,
      component,
      error_message: err?.message || String(err),
      error_details: err?.stack ? { stack: err.stack } : null,
    });
  }
}

export const logger = new Logger();
export { ActionTypes, InteractionTypes, InteractionStatus };
