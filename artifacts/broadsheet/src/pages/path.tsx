import { useParams } from 'wouter';
import { 
  useGetStoryworld, 
  useListStoryPaths, 
  useListContributions, 
  getGetStoryworldQueryKey, 
  getListStoryPathsQueryKey, 
  getListContributionsQueryKey 
} from '@workspace/api-client-react';
import { useMemo } from 'react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { Masthead } from '@/components/masthead';
import { BsFooter } from '@/components/bs-footer';
import { LoadingState, ErrorState } from '@/components/states';

export default function PathPage() {
  const { worldId, pathId } = useParams();
  const wId = Number(worldId);
  const pId = Number(pathId);

  const { data: world, isLoading: worldLoading, isError: worldError } = useGetStoryworld(wId, {
    query: {
      enabled: !!wId,
      queryKey: getGetStoryworldQueryKey(wId)
    }
  });

  const { data: paths, isLoading: pathsLoading, isError: pathsError } = useListStoryPaths(wId, {
    query: {
      enabled: !!wId,
      queryKey: getListStoryPathsQueryKey(wId)
    }
  });

  const { data: contributions, isLoading: contributionsLoading, isError: contributionsError } = useListContributions(wId, pId, {
    query: {
      enabled: !!wId && !!pId,
      queryKey: getListContributionsQueryKey(wId, pId)
    }
  });

  if (worldLoading || pathsLoading || contributionsLoading) return <LoadingState />;
  if (worldError || pathsError || contributionsError) return <ErrorState />;

  const path = paths?.find(p => p.id === pId);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Masthead />
      
      <div className="mb-16 text-center">
        <div className="inline-block text-left mb-6 w-full max-w-2xl mx-auto">
          <div className="font-mono text-[#c46a2c] text-[0.55rem] tracking-[0.14em] uppercase border-l-2 border-[#c46a2c] pl-2 mb-2">
            PATH {pId}
          </div>
          <h1 className="font-display text-[2rem] leading-tight text-[#2a2320]">
            {path?.title}
          </h1>
          <div className="font-mono text-[#6b7280] text-xs mt-2 uppercase tracking-wide">
            {world?.title}
          </div>
        </div>
      </div>
      
      <div className="max-w-2xl mx-auto flex flex-col gap-12">
        {(!contributions || contributions.length === 0) ? (
          <div className="font-mono italic text-[#6b7280] text-center text-sm">
            No contributions yet.
          </div>
        ) : (
          contributions.map((c, idx) => (
            <ContributionArticle key={c.id} contribution={c} index={idx} isLast={idx === contributions.length - 1} />
          ))
        )}
      </div>

      <BsFooter />
    </div>
  );
}

function ContributionArticle({ contribution, index, isLast }: { contribution: any, index: number, isLast: boolean }) {
  const html = useMemo(() => {
    return DOMPurify.sanitize(marked.parse(contribution.summary ?? '') as string);
  }, [contribution.summary]);

  return (
    <div className="flex flex-col">
      <div className="font-mono text-[#c46a2c] text-lg mb-4">
        § {index + 1}
      </div>
      <h2 className="font-display text-[1.2rem] text-[#2a2320] mb-6">
        {contribution.title}
      </h2>
      
      {contribution.summary ? (
        <div 
          className="font-body text-[#2a2320] text-[0.88rem] leading-[1.7] prose prose-p:mb-4 prose-a:text-[#c46a2c]" 
          dangerouslySetInnerHTML={{ __html: html }} 
        />
      ) : (
        <div className="font-mono italic text-[#6b7280] text-sm mb-6">
          No summary recorded.
        </div>
      )}
      
      <div className="mt-8 flex items-center justify-between">
        <div className="font-body text-sm text-[#4b4035]">
          Written by <span className="font-semibold text-[#2a2320]">{contribution.contributorDisplayName || 'Anonymous'}</span>
        </div>
        {contribution.agentAssisted && (
          <div className="font-mono text-[#c46a2c] text-[0.55rem] uppercase tracking-wider bg-[#ede8e2] px-2 py-1 rounded-[2px] border border-[#d4cfc9]">
            AGENT-ASSISTED
          </div>
        )}
      </div>
      
      {!isLast && (
        <div className="border-b border-[#d4cfc9] w-full mt-12" />
      )}
    </div>
  );
}
