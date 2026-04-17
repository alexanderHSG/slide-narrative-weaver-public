import { useState } from 'react';
import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react';
import { Plus } from 'lucide-react';

const AddNodeDialog = ({ isOpen, onClose, onAddNode, openai, driver, networkRef, storyPoints }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    goals: '',
    outcome: '',
    appendToExisting: false,
  });
  const handleSubmit = async e => {
    e.preventDefault();
    setLoading(true);
    try {
      console.log('-- handleSubmit called --');
      console.log('formData:', formData);
      const chatResponse = await openai.chat.completions.create({
        model: 'gpt-4.1',
        messages: [
          {
            role: 'system',
            content: `Return a JSON object like {"description": "..."} only.
                                            No extra keys. Keep the description short.`,
          },
          {
            role: 'user',
            content: `Topic: ${formData.title}\nGoals: ${formData.goals}\nOutcome: ${formData.outcome}`,
          },
        ],
        temperature: 0.7,
      });
      console.log('1) ChatGPT response =>', chatResponse);
      const generated = JSON.parse(chatResponse.choices[0].message.content);
      console.log('2) generated =>', generated);
      if (!generated.description) {
        throw new Error("Missing 'description' in GPT response.");
      }
      const description = generated.description;
      console.log('3) description =>', description);
      const embeddingResponse = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: description,
      });
      console.log('4) embeddingResponse =>', embeddingResponse);
      const embedding = embeddingResponse.data[0].embedding;
      console.log('5) embedding (partial) =>', embedding.slice(0, 5), '...');
      const session = driver.session();
      let similarSlides = [];
      try {
        const result = await session.run(
          `
                        MATCH (slide:SLIDE)
                        WHERE slide.embedding IS NOT NULL
                        WITH slide,
                                 reduce(dot=0.0, i in range(0, size($embedding)-1) |
                                     dot + slide.embedding[i] * $embedding[i]
                                 ) AS dotProduct,
                                 sqrt(
                                     reduce(normA=0.0, j in range(0, size(slide.embedding)-1) |
                                         normA + slide.embedding[j]^2
                                     )
                                 ) AS normA,
                                 sqrt(
                                     reduce(normB=0.0, k in range(0, size($embedding)-1) |
                                         normB + $embedding[k]^2
                                     )
                                 ) AS normB
                        WITH slide, dotProduct / (normA * normB) AS sim
                        WHERE sim > 0.5
                        RETURN slide, sim
                        ORDER BY sim DESC
                        LIMIT 3
                    `,
          { embedding }
        );
        similarSlides = result.records.map(record => ({
          content: record.get('slide').properties.content,
          similarity: record.get('sim'),
        }));
      } finally {
        await session.close();
      }
      console.log('6) similarSlides =>', similarSlides);
      const newPoint = {
        id: `VSP_${Date.now()}`,
        description,
        slide1Content: similarSlides[0]?.content || 'No Slide 1',
        slide2Content: similarSlides[1]?.content || 'No Slide 2',
        slide3Content: similarSlides[2]?.content || 'No Slide 3',
      };
      console.log('7) newPoint =>', newPoint);
      if (networkRef?.current) {
        console.log('8) Updating network with new point');
        const nodes = networkRef.current.body.data.nodes;
        const edges = networkRef.current.body.data.edges;
        nodes.add({
          id: newPoint.id,
          label: `SP${storyPoints.length + 1}\n${newPoint.description}`,
          group: 'storypoint',
          description: newPoint.description,
          color: {
            background: '#2E7D32',
            border: '#1B5E20',
            highlight: { background: '#1B5E20', border: '#4CAF50' },
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
          const slideId = `${newPoint.id}_slide_${index}`;
          const content =
            index === 0
              ? newPoint.slide1Content
              : index === 1
                ? newPoint.slide2Content
                : newPoint.slide3Content;
          nodes.add({
            id: slideId,
            label: `${slideType}\n[+] Double click to expand\n${content.substring(0, 50)}...`,
            group: 'slide',
            parentId: newPoint.id,
            slideData: { type: slideType, content, expanded: false },
            color: {
              background: '#F3F4F6',
              border: '#D1D5DB',
              highlight: { background: '#E5E7EB', border: '#9CA3AF' },
            },
          });
          edges.add({
            from: slideId,
            to: newPoint.id,
            label: `${100 - index * 10}%`,
            arrows: 'to',
            color: { color: '#2E7D32' },
            smooth: { type: 'curvedCW', roundness: 0.2 },
          });
        });
        if (formData.appendToExisting && storyPoints.length > 0) {
          edges.add({
            from: storyPoints[storyPoints.length - 1].id,
            to: newPoint.id,
            arrows: 'to',
            color: { color: '#2E7D32' },
            width: 3,
            smooth: { type: 'curvedCW', roundness: 0.2 },
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
      await onAddNode(newPoint);
      console.log('✅ done, closing dialog');
      onClose();
    } catch (error) {
      console.error('❌ handleSubmit error:', error.message, error.stack);
      alert(error.message || 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };
  return (
    <Dialog open={isOpen} onClose={onClose}>
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <DialogPanel className="mx-auto max-w-2xl rounded-lg bg-white p-6 shadow-xl">
          <DialogTitle className="text-xl font-semibold mb-4">
            Add Virtual Story Point
          </DialogTitle >
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Topic/Title</label>
              <input
                type="text"
                value={formData.title}
                onChange={e => {
                  setFormData(prev => ({ ...prev, title: e.target.value.replace(/['"]+/g, '') }));
                }}
                onKeyDown={e => {
                  if (e.key === ' ') {
                    e.preventDefault();
                    const cursorPosition = e.target.selectionStart;
                    const textBeforeCursor = formData.title.slice(0, cursorPosition);
                    const textAfterCursor = formData.title.slice(cursorPosition);
                    setFormData(prev => ({
                      ...prev,
                      title: textBeforeCursor + ' ' + textAfterCursor,
                    }));
                    setTimeout(() => {
                      e.target.selectionStart = e.target.selectionEnd = cursorPosition + 1;
                    }, 0);
                  }
                }}
                className="w-full p-2 border rounded"
                placeholder="What should this story point be about?"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Goals</label>
              <textarea
                value={formData.goals}
                onChange={e => {
                  setFormData(prev => ({ ...prev, goals: e.target.value.replace(/['"]+/g, '') }));
                }}
                onKeyDown={e => {
                  if (e.key === ' ') {
                    e.preventDefault();
                    const cursorPosition = e.target.selectionStart;
                    const textBeforeCursor = formData.goals.slice(0, cursorPosition);
                    const textAfterCursor = formData.goals.slice(cursorPosition);
                    setFormData(prev => ({
                      ...prev,
                      goals: textBeforeCursor + ' ' + textAfterCursor,
                    }));
                    setTimeout(() => {
                      e.target.selectionStart = e.target.selectionEnd = cursorPosition + 1;
                    }, 0);
                  }
                }}
                className="w-full p-2 border rounded h-24"
                placeholder="What are the main goals?"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Expected Outcome</label>
              <textarea
                value={formData.outcome}
                onChange={e => {
                  setFormData(prev => ({ ...prev, outcome: e.target.value.replace(/['"]+/g, '') }));
                }}
                onKeyDown={e => {
                  if (e.key === ' ') {
                    e.preventDefault();
                    const cursorPosition = e.target.selectionStart;
                    const textBeforeCursor = formData.outcome.slice(0, cursorPosition);
                    const textAfterCursor = formData.outcome.slice(cursorPosition);
                    setFormData(prev => ({
                      ...prev,
                      outcome: textBeforeCursor + ' ' + textAfterCursor,
                    }));
                    setTimeout(() => {
                      e.target.selectionStart = e.target.selectionEnd = cursorPosition + 1;
                    }, 0);
                  }
                }}
                className="w-full p-2 border rounded h-24"
                placeholder="What should be achieved?"
                required
              />
            </div>
            {storyPoints?.length > 0 && (
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="appendToExisting"
                  checked={formData.appendToExisting}
                  onChange={e =>
                    setFormData(prev => ({
                      ...prev,
                      appendToExisting: e.target.checked,
                    }))
                  }
                  className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                />
                <label htmlFor="appendToExisting" className="text-sm text-gray-700">
                  Append to existing chain
                </label>
              </div>
            )}
            <div className="flex justify-end gap-2 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    Create Story Point
                  </>
                )}
              </button>
            </div>
          </form>
        </DialogPanel>
      </div>
    </Dialog>
  );
};

export default AddNodeDialog;