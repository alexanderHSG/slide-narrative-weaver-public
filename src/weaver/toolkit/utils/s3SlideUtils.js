import { useEffect } from 'react';

const FN_PATH = '/.netlify/functions/slide';

function sanitizeId(v) {
  if (typeof v !== 'string') return null;
  const trimmed = v.trim();
  if (/^[A-Za-z0-9._-]+$/.test(trimmed)) return trimmed;
  if (/^SP_\d+_\d+_slide_\d+$/.test(trimmed)) {
    const parts = trimmed.split('_');
    if (parts[1]) return parts[1];
  }
  const m = trimmed.match(/([A-Za-z0-9._-]{6,})/g);
  return m && m.length ? m[0] : null;
}

function buildSlideUrl(objectId) {
  if (!objectId) return null;
  return `${FN_PATH}?objectId=${encodeURIComponent(objectId)}`;
}

export async function findSimilarSlides(storyPointText, driver, limit = 3) {
  console.log('Finding similar slides for: "' + storyPointText.substring(0, 50) + '..."');

  try {
    const keywords = extractKeywords(storyPointText);
    console.log('Extracted keywords:', keywords);

    let slides = await findSlidesByKeywords(driver, keywords, limit);

    if (slides.length === 0) {
      console.log('No slides found by keywords, trying topics...');
      const topics = await getAvailableTopics(driver);
      for (const topic of topics) {
        if (keywords.some(keyword => topic.toLowerCase().includes(keyword.toLowerCase()))) {
          console.log(`Found matching topic: ${topic}`);
          const topicSlides = await findSlidesByTopic(driver, topic, limit);
          slides = [...slides, ...topicSlides];
          if (slides.length >= limit) break;
        }
      }
    }

    if (slides.length === 0) {
      console.log('No slides found by topics, trying categories...');
      const categories = await getAvailableCategories(driver);
      for (const category of categories) {
        if (keywords.some(keyword => category.toLowerCase().includes(keyword.toLowerCase()))) {
          console.log(`Found matching category: ${category}`);
          const categorySlides = await findSlidesByCategory(driver, category, limit);
          slides = [...slides, ...categorySlides];
          if (slides.length >= limit) break;
        }
      }
    }

    if (slides.length === 0) {
      console.log('No slides found by any method, fetching random slides...');
      slides = await getRandomSlides(driver, limit);
    }

    console.log(`Found ${slides.length} slides matching keywords or fallbacks`);
    return slides.slice(0, limit);
  } catch (error) {
    console.error('Error finding similar slides:', error);
    return getRandomSlides(driver, limit);
  }
}

async function findSlidesByKeywords(driver, keywords, limit = 3) {
  try {
    const session = driver.session();
    try {
      const keywordConditions = keywords.flatMap(keyword => [
        "s.title CONTAINS '" + keyword + "'",
        "s.textual_content CONTAINS '" + keyword + "'",
      ]);

      const whereClause = keywordConditions.join(' OR ');

      const query =
        'MATCH (s:SLIDE) ' +
        'WHERE ' + whereClause + ' ' +
        'RETURN s.id AS slide_id, s.title AS title, s.object_id AS object_id, ' +
        '       s.textual_content AS content, count(*) as score ' +
        'ORDER BY score DESC ' +
        'LIMIT ' + limit;

      const result = await session.run(query);

      const slides = result.records.map(record => ({
        id: record.get('slide_id'),
        title: record.get('title'),
        objectId: record.get('object_id'),
        content: record.get('content'),
        score: record.get('score').toNumber(),
      }));

      console.log('Found ' + slides.length + ' slides matching keywords');
      return slides;
    } finally {
      await session.close();
    }
  } catch (error) {
    console.error('Error finding slides by keywords:', error);
    return [];
  }
}

async function getAvailableTopics(driver, limit = 10) {
  try {
    const session = driver.session();
    try {
      const result = await session.run(
        'MATCH (t:TOPIC) ' + 'RETURN t.topic AS topic ' + 'LIMIT ' + limit
      );

      const topics = result.records.map(record => record.get('topic'));
      console.log('Found ' + topics.length + ' topics');
      return topics;
    } finally {
      await session.close();
    }
  } catch (error) {
    console.error('Error getting topics:', error);
    return [];
  }
}

async function getAvailableCategories(driver, limit = 10) {
  try {
    const session = driver.session();
    try {
      const result = await session.run(`
        MATCH (c:CATEGORY) 
        RETURN c.category AS category 
        LIMIT ${limit}
      `);

      const categories = result.records.map(record => record.get('category'));
      console.log(`Found ${categories.length} categories`);
      return categories;
    } finally {
      await session.close();
    }
  } catch (error) {
    console.error('Error getting categories:', error);
    return [];
  }
}

async function findSlidesByTopic(driver, topic, limit = 3) {
  try {
    const session = driver.session();
    try {
      const query = `
        MATCH (t:TOPIC {topic: '${topic}'})<-[:HAS_TOPIC]-(s:SLIDE)
        RETURN s.id AS slide_id, s.title AS title, s.object_id AS object_id, 
               s.textual_content AS content
        LIMIT ${limit}
      `;

      const result = await session.run(query);

      const slides = result.records.map(record => ({
        id: record.get('slide_id'),
        title: record.get('title'),
        objectId: record.get('object_id'),
        content: record.get('content'),
        source: 'topic',
      }));

      console.log(`Found ${slides.length} slides related to topic '${topic}'`);
      return slides;
    } finally {
      await session.close();
    }
  } catch (error) {
    console.error(`Error finding slides by topic ${topic}:`, error);
    return [];
  }
}

async function findSlidesByCategory(driver, category, limit = 3) {
  try {
    const session = driver.session();
    try {
      const query = `
        MATCH (c:CATEGORY {category: '${category}'})<-[:BELONGS_TO]-
              (sd:SLIDE_DECK)-[:CONTAINS]->(s:SLIDE)
        RETURN s.id AS slide_id, s.title AS title, s.object_id AS object_id, 
               s.textual_content AS content, sd.deck_id AS deck_id
        LIMIT ${limit}
      `;

      const result = await session.run(query);

      const slides = result.records.map(record => ({
        id: record.get('slide_id'),
        title: record.get('title'),
        objectId: record.get('object_id'),
        content: record.get('content'),
        deckId: record.get('deck_id'),
        source: 'category',
      }));

      console.log(`Found ${slides.length} slides in category '${category}'`);
      return slides;
    } finally {
      await session.close();
    }
  } catch (error) {
    console.error(`Error finding slides by category ${category}:`, error);
    return [];
  }
}

async function getRandomSlides(driver, limit = 3) {
  try {
    const session = driver.session();
    try {
      const query = `
        MATCH (s:SLIDE)
        WHERE s.object_id IS NOT NULL AND s.title IS NOT NULL
        RETURN s.id AS slide_id, s.title AS title, s.object_id AS object_id, 
               s.textual_content AS content
        LIMIT ${limit}
      `;

      const result = await session.run(query);

      const slides = result.records.map(record => ({
        id: record.get('slide_id'),
        title: record.get('title'),
        objectId: record.get('object_id'),
        content: record.get('content'),
        source: 'random',
      }));

      console.log(`Fetched ${slides.length} random slides as fallback`);
      return slides;
    } finally {
      await session.close();
    }
  } catch (error) {
    console.error('Error fetching random slides:', error);
    return [];
  }
}

export function extractKeywords(text, maxKeywords = 5) {
  console.log(`Extracting keywords from: "${text.substring(0, 50)}..."`);

  const stopWords = new Set([
    'a','about','above','after','again','against','all','am','an','and',
    'any','are','as','at','be','because','been','before','being','below',
    'between','both','but','by','could','did','do','does','doing','down',
    'during','each','few','for','from','further','had','has','have',
    'having','he','her','here','hers','herself','him','himself','his',
    'how','i','if','in','into','is','it','its','itself','me','more',
    'most','my','myself','no','nor','not','of','off','on','once',
    'only','or','other','ought','our','ours','ourselves','out','over',
    'own','same','she','should','so','some','such','than','that','the',
    'their','theirs','them','themselves','then','there','these','they',
    'this','those','through','to','too','under','until','up','very',
    'was','we','were','what','when','where','which','while','who',
    'whom','why','with','would','you','your','yours','yourself','yourselves'
  ]);

  const cleanText = text.toLowerCase().replace(/[^\w\s]/g, ' ');
  const words = cleanText.split(/\s+/);

  const keywords = words
    .filter(word => !stopWords.has(word) && word.length > 2)
    .slice(0, maxKeywords);

  console.log('Extracted keywords:', keywords);
  return keywords;
}

function getPublicS3Url(objectId) {
  return buildSlideUrl(objectId);
}

export async function loadSlideFromS3(objectId) {
  if (!objectId) {
    console.error('No object ID provided for slide');
    return null;
  }

  try {
    const cleanId = sanitizeId(objectId);
    if (!cleanId) {
      console.warn('Invalid objectId format:', objectId);
      return null;
    }

    const slideUrl = buildSlideUrl(cleanId);
    console.log(`Loading slide image via proxy: ${slideUrl}`);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(slideUrl, {
        method: 'HEAD',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        console.log(`Verified slide image exists at: ${slideUrl}`);
        return slideUrl;
      } else {
        console.error(`Slide image not found at: ${slideUrl}, status: ${response.status}`);
        return null;
      }
    } catch (error) {
      console.warn(`HEAD check failed, falling back to direct use: ${error}`);
      return slideUrl;
    }
  } catch (error) {
    console.error(`Error preparing slide URL: ${error}`);
    return null;
  }
}

export function useS3ImageStateManager(showImages, networkRef) {
  useEffect(() => {
    if (!networkRef?.current || !showImages) return;

    const enforceSlideImageState = async () => {
      console.log('Enforcing slide image state via proxy');

      const fallbackImage =
        'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
      const preloadFallback = new Image();
      preloadFallback.src = fallbackImage;

      const nodes = networkRef.current.body.data.nodes;
      const allNodes = nodes.get();

      console.log(
        `Found ${allNodes.filter(n => n.group === 'slide').length} slide nodes to process`
      );

      let processedCount = 0;

      const processNodes = async () => {
        for (const node of allNodes) {
          if (node.group === 'slide') {
            await processSlideNode(node);
            processedCount++;

            if (processedCount % 5 === 0) {
              await new Promise(resolve => setTimeout(resolve, 50));
            }
          }
        }

        try {
          networkRef.current.redraw();
          console.log(`Successfully processed ${processedCount} slide nodes`);
        } catch (error) {
          console.error('Error in final network redraw:', error);
        }
      };

      const processSlideNode = async node => {
        try {
          const raw =
            node.slideData?.objectId ||
            node.slideData?.object_id ||
            (typeof node.id === 'string'
              ? node.id.replace(/^.*_slide_(\d+)$/, '$1')
              : null);

          const objectId = sanitizeId(raw);
          if (!objectId) {
            console.log(`No valid object ID found for slide node: ${node.id}`);
            displayAsText(node);
            return;
          }

          const proxyUrl = buildSlideUrl(objectId);

          nodes.update({
            id: node.id,
            shape: 'image',
            image: proxyUrl,
            brokenImage: fallbackImage,
            size: 40,
            font: { size: 0 },
            borderWidth: 1,
            color: {
              border: '#D1D5DB',
              highlight: {
                border: '#9CA3AF',
              },
            },
          });

          const img = new Image();

          img.onload = () => {
            console.log(`Successfully loaded image for node ${node.id}`);
          };

          img.onerror = () => {
            console.error(`Failed to load image for node ${node.id}`);
            setTimeout(() => {
              displayAsText(node);
            }, 50);
          };

          img.src = proxyUrl;
        } catch (error) {
          console.error(`Error updating slide node ${node.id}:`, error);
          displayAsText(node);
        }
      };

      const displayAsText = node => {
        try {
          nodes.update({
            id: node.id,
            shape: 'box',
            label:
              node.label ||
              `${node.slideData?.type || 'Slide'}\n${
                node.slideData?.content?.substring(0, 50) || '[No content]'
              }...`,
            font: {
              color: '#1F2937',
              size: node.slideData?.expanded ? 12 : 14,
              multi: true,
            },
            color: {
              background: '#F3F4F6',
              border: '#D1D5DB',
              highlight: {
                background: '#E5E7EB',
                border: '#9CA3AF',
              },
            },
          });
        } catch (error) {
          console.warn(`Error updating node ${node.id} to text fallback:`, error);
        }
      };

      processNodes();
    };

    enforceSlideImageState();
  }, [showImages, networkRef]);
}

export async function generateSlidesForStoryPoint(storyPoint, openai, driver) {
  console.log('Generating slides for story point:', storyPoint.id);

  try {
    const similarSlides = await findSimilarSlides(storyPoint.description, driver, 3);
    console.log('Similar slides found:', similarSlides.length);

    const slideContents = {
      slide1Content: similarSlides[0]?.content || 'No matching content found',
      slide2Content: similarSlides[1]?.content || 'No matching content found',
      slide3Content: similarSlides[2]?.content || 'No matching content found',
    };

    const slideObjectIds = {
      slide1ObjectId: similarSlides[0]?.objectId || null,
      slide2ObjectId: similarSlides[1]?.objectId || null,
      slide3ObjectId: similarSlides[2]?.objectId || null,
    };

    return { ...slideContents, ...slideObjectIds };
  } catch (error) {
    console.error('Error generating slides:', error);

    return {
      slide1Content: `Default content about ${storyPoint.description}`,
      slide2Content: `Alternative perspective on ${storyPoint.description}`,
      slide3Content: `Summary of key points about ${storyPoint.description}`,
      slide1ObjectId: null,
      slide2ObjectId: null,
      slide3ObjectId: null,
    };
  }
}

export async function createStoryPoint(title, openai, driver) {
  console.log('Creating new story point:', title);

  try {
    const storyPointId = `SP_${Date.now()}`;

    const slideData = await generateSlidesForStoryPoint(
      { id: storyPointId, description: title },
      openai,
      driver
    );

    const session = driver.session();
    try {
      await session.run(
        `
        CREATE (sp:STORYPOINT {
          id: $storyPointId,
          description: $description,
          slide1Content: $slide1Content,
          slide2Content: $slide2Content,
          slide3Content: $slide3Content,
          slide1ObjectId: $slide1ObjectId,
          slide2ObjectId: $slide2ObjectId,
          slide3ObjectId: $slide3ObjectId
        })
        RETURN sp
      `,
        {
          storyPointId,
          description: title,
          slide1Content: slideData.slide1Content,
          slide2Content: slideData.slide2Content,
          slide3Content: slideData.slide3Content,
          slide1ObjectId: slideData.slide1ObjectId,
          slide2ObjectId: slideData.slide2ObjectId,
          slide3ObjectId: slideData.slide3ObjectId,
        }
      );

      for (let i = 1; i <= 3; i++) {
        const slideId = `SLIDE_${storyPointId}_${i}`;
        const objectId = slideData[`slide${i}ObjectId`];
        const content = slideData[`slide${i}Content`];

        await session.run(
          `
          CREATE (s:SLIDE {
            id: $slideId,
            content: $content,
            object_id: $objectId,
            type: 'slide'
          })
          WITH s
          MATCH (sp:STORYPOINT {id: $storyPointId})
          CREATE (s)-[:ASSIGNED_TO]->(sp)
        `,
          {
            slideId,
            content,
            objectId,
            storyPointId,
          }
        );
      }

      console.log('Story point and slides created successfully');

      return {
        id: storyPointId,
        description: title,
        ...slideData,
      };
    } finally {
      await session.close();
    }
  } catch (error) {
    console.error('Error creating story point:', error);
    throw error;
  }
}

export function updateVisualization(storyPoint, networkRef, existingPoints) {
  if (!networkRef?.current) return;

  console.log('Updating visualization with new story point');

  const nodes = networkRef.current.body.data.nodes;
  const edges = networkRef.current.body.data.edges;

  nodes.add({
    id: storyPoint.id,
    label: `SP${existingPoints.length + 1}\n${storyPoint.description}`,
    group: 'storypoint',
    description: storyPoint.description,
    color: {
      background: '#2E7D32',
      border: '#1B5E20',
      highlight: {
        background: '#1B5E20',
        border: '#4CAF50',
      },
    },
    font: {
      face: 'Inter, system-ui, sans-serif',
      bold: true,
      size: 14,
      color: 'white',
      align: 'center',
      multi: true,
    },
    size: 50,
  });

  ['Slide 1', 'Slide 2', 'Slide 3'].forEach((slideType, index) => {
    const slideId = `${storyPoint.id}_slide_${index}`;
    const content =
      slideType === 'Slide 1'
        ? storyPoint.slide1Content
        : slideType === 'Slide 2'
        ? storyPoint.slide2Content
        : storyPoint.slide3Content;
    const objectId =
      slideType === 'Slide 1'
        ? storyPoint.slide1ObjectId
        : slideType === 'Slide 2'
        ? storyPoint.slide2ObjectId
        : storyPoint.slide3ObjectId;

    nodes.add({
      id: slideId,
      label: `${slideType}\n[+] Double click to expand\n${(content || '').substring(0, 50)}...`,
      group: 'slide',
      parentId: storyPoint.id,
      slideData: {
        type: slideType,
        content: content,
        objectId: objectId,
        expanded: false,
        object_id: objectId,
      },
      color: {
        background: '#F3F4F6',
        border: '#D1D5DB',
        highlight: {
          background: '#E5E7EB',
          border: '#9CA3AF',
        },
      },
    });

    edges.add({
      from: slideId,
      to: storyPoint.id,
      label: `${
        storyPoint.slides?.[index]?.percentage ||
        Math.round((storyPoint.slides?.[index]?.similarity || 0) * 100) ||
        50
      }%`,
      arrows: 'to',
      color: { color: '#2E7D32' },
      smooth: {
        type: 'curvedCW',
        roundness: 0.2,
      },
    });
  });

  if (existingPoints.length > 0) {
    const lastPoint = existingPoints[existingPoints.length - 1];
    edges.add({
      from: lastPoint.id,
      to: storyPoint.id,
      arrows: 'to',
      color: { color: '#2E7D32' },
      width: 3,
      smooth: {
        type: 'curvedCW',
        roundness: 0.2,
      },
    });
  }

  networkRef.current.setOptions({
    layout: {
      hierarchical: {
        enabled: true,
        direction: 'LR',
        sortMethod: 'directed',
        levelSeparation: 250,
        nodeSpacing: 200,
        treeSpacing: 200,
      },
    },
  });

  setTimeout(() => {
    networkRef.current.stabilize();
    networkRef.current.fit();
  }, 100);
}
