import * as Tooltip from '@radix-ui/react-tooltip';
import { Info } from 'lucide-react';

const SearchModeTooltip = () => {
    return(
        <Tooltip.Provider delayDuration={100}>
            <Tooltip.Root>
                <Tooltip.Trigger asChild>
                <button type="button" className="p-1 text-gray-400 hover:text-gray-600">
                    <Info className="w-4 h-4" />
                </button>
                </Tooltip.Trigger>
                <Tooltip.Content
                side="top"
                align="start"
                className="rounded-md bg-gray-900 text-white text-sm px-3 py-2 shadow-lg z-50 max-w-[240px]"
                sideOffset={5}
                >
                <p className="text-left">
                    <strong>Similarity search</strong> finds slides that are semantically close to your query using AI-powered similarity matching.
                    <br />
                    <strong>Keyword search</strong> finds slides that contain exact words from your query in the text.
                </p>
                <Tooltip.Arrow className="fill-gray-900" />
                </Tooltip.Content>
            </Tooltip.Root>
            </Tooltip.Provider>

    );
};


export default SearchModeTooltip;


