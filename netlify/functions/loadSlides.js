import { driver } from './neo4jConfig.js'
import getCachedEmbedding from './getCachedEmbedding.js'

function buildSlideUrl(objectId) {
  return objectId
    ? `/.netlify/functions/slide?objectId=${encodeURIComponent(objectId)}`
    : null;
}

export async function loadSlides({
  description,
  limit = 3,
  guidancePrompt = '',
  searchType = 'all'
}, sessionArg) {

  const session = sessionArg || driver.session();

  try {
    const intLimit   = Math.floor(limit);
    const searchText = guidancePrompt ? `${description} ${guidancePrompt}` : description;

    const embedding = await getCachedEmbedding(searchText);
    let typeCond = '';
    if (searchType === 'stories') typeCond = 'AND s.onCanvas = true';
    if (searchType === 'pdfs')    typeCond = "AND s.source = 'pdf'";

    const vecQ = `
      MATCH (s:SLIDE)
      WHERE s.embedding IS NOT NULL
        AND s.object_id IS NOT NULL
        AND s.textual_content IS NOT NULL
        AND s.textual_content <> ''
        ${typeCond}
      WITH s,
        reduce(dot=0.0,i IN range(0,size(s.embedding)-1)|
          dot + s.embedding[i]*$embedding[i]
        )
        /
        ( sqrt(reduce(n1=0.0,i IN range(0,size(s.embedding)-1)|
             n1 + s.embedding[i]*s.embedding[i]
           )) *
          sqrt(reduce(n2=0.0,i IN range(0,size($embedding)-1)|
             n2 + $embedding[i]*$embedding[i]
           ))
        ) AS similarity
      RETURN
        s.id               AS slide_id,
        s.title            AS title,
        s.object_id        AS object_id,
        s.textual_content  AS content,
        toInteger(similarity*100) AS percentage,
        similarity         AS raw_score
      ORDER BY similarity DESC
      LIMIT ${intLimit}
    `;
    let res = await session.run(vecQ, { embedding, intLimit });
    let slides = res.records.map(r => {
      const obj = r.get('object_id');
      return {
        id:         r.get('slide_id'),
        title:      r.get('title'),
        content:    r.get('content'),
        object_id:  obj,             
        percentage: +r.get('percentage'),
        similarity: +r.get('raw_score'),
        s3Url:      buildSlideUrl(obj),
      };
    });

    if (slides.length < intLimit) {
      const rem = intLimit - slides.length;
      const keyQ = `
        MATCH (s:SLIDE)
        WHERE (s.title CONTAINS $desc OR s.textual_content CONTAINS $desc)
          AND s.object_id IS NOT NULL
          ${typeCond}
        RETURN
          s.id AS slide_id,
          s.title AS title,
          s.object_id AS object_id,
          s.textual_content AS content
        LIMIT ${rem}
      `;
      const keyRes = await session.run(keyQ, { desc: description, rem });
      const keySlides = keyRes.records.map(r => {
        const obj = r.get('object_id');
        return {
          id:         r.get('slide_id'),
          title:      r.get('title'),
          content:    r.get('content'),
          object_id:  obj,           
          percentage: 50,
          similarity: 0.5,
          s3Url:      buildSlideUrl(obj),
        };
      });
      const existing = new Set(slides.map(s => s.id));
      keySlides.forEach(s => !existing.has(s.id) && slides.push(s));
    }

    if (slides.length < intLimit) {
      const rem = intLimit - slides.length;
      const randQ = `
        MATCH (s:SLIDE)
        WHERE s.object_id IS NOT NULL
          AND s.textual_content IS NOT NULL
          AND s.textual_content <> ''
          ${typeCond}
        RETURN
          s.id AS slide_id,
          s.title AS title,
          s.object_id AS object_id,
          s.textual_content AS content
        ORDER BY rand()
        LIMIT ${rem}
      `;
      const randRes = await session.run(randQ, { rem });
      const randSlides = randRes.records.map(r => {
        const obj = r.get('object_id');
        return {
          id:         r.get('slide_id'),
          title:      r.get('title'),
          content:    r.get('content'),
          object_id:  obj,
          percentage: 30,
          similarity: 0.3,
          s3Url:      buildSlideUrl(obj),
        };
      });
      const existing = new Set(slides.map(s => s.id));
      randSlides.forEach(s => !existing.has(s.id) && slides.push(s));
    }

    return slides.slice(0, intLimit);
  } finally {
    if (!sessionArg) await session.close();
  }
}
