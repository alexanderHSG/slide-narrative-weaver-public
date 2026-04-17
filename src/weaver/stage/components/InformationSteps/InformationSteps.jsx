const InformationSteps = () => (
  <div className="mb-12 max-w-4xl mx-auto">
    <div className="grid grid-cols-2 gap-8">
      <div className="bg-green-50 p-6 rounded-xl">
        <div className="flex items-start space-x-3">
          <div className="w-8 h-8 rounded-full bg-green-700 text-white flex items-center justify-center flex-shrink-0">
            1
          </div>
          <div>
            <h3 className="font-medium text-lg text-gray-800 mb-2">Define Your Story</h3>
            <p className="text-gray-600">Choose a topic and define your presentation structure:</p>
            <ul className="mt-3 space-y-2 text-gray-600">
              <li>• Topic and objectives</li>
              <li>• Target audience</li>
              <li>• Expected outcomes</li>
            </ul>
          </div>
        </div>
      </div>
      <div className="bg-green-50 p-6 rounded-xl">
        <div className="flex items-start space-x-3">
          <div className="w-8 h-8 rounded-full bg-green-700 text-white flex items-center justify-center flex-shrink-0">
            2
          </div>
          <div>
            <h3 className="font-medium text-lg text-gray-800 mb-2">Build Your Story</h3>
            <p className="text-gray-600">Create and organize your content:</p>
            <ul className="mt-3 space-y-2 text-gray-600">
              <li>• Add story points</li>
              <li>• Connect related content</li>
              <li>• Review and refine</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  </div>
);

export default InformationSteps;