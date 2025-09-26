interface LoadingSkeletonProps {
  className?: string;
}

const LoadingSkeleton = ({ className = '' }: LoadingSkeletonProps) => {
  return (
    <div className={`animate-pulse bg-gray-200 rounded ${className}`} />
  );
};

export const ChatLoadingSkeleton = () => {
  return (
    <div className="w-full px-4 mx-auto max-w-full lg:max-w-4xl flex flex-col items-center min-h-screen">
      {/* Banner Skeleton */}
      <div className="mb-4 w-full max-w-md flex justify-center items-center mt-4">
        <LoadingSkeleton className="w-full h-48" />
      </div>

      {/* Main Chat Card Skeleton */}
      <div className="mt-4 w-full lg:w-4/5 flex-1">
        <div className="w-full mx-auto shadow-lg border-t-purple-600 border-t-6 bg-white rounded-lg">
          {/* Header Skeleton */}
          <div className="bg-purple-600 p-6 rounded-t-lg">
            <LoadingSkeleton className="h-8 w-3/4 mx-auto bg-purple-400" />
          </div>

          {/* Chat Content Skeleton */}
          <div className="space-y-6 p-4 sm:p-6">
            <div className="flex flex-col gap-6">
              <div className="flex-1 flex flex-col">
                {/* Messages Container Skeleton */}
                <div className="flex-1 bg-white rounded-lg p-3 mb-3 h-[400px] border border-gray-200 space-y-4">
                  {/* Bot message skeleton */}
                  <div className="flex justify-start">
                    <LoadingSkeleton className="h-12 w-3/4 rounded-2xl" />
                  </div>
                  
                  {/* User message skeleton */}
                  <div className="flex justify-end">
                    <LoadingSkeleton className="h-8 w-1/2 rounded-2xl" />
                  </div>
                  
                  {/* Bot message skeleton */}
                  <div className="flex justify-start">
                    <LoadingSkeleton className="h-16 w-4/5 rounded-2xl" />
                  </div>
                </div>

                {/* Input Skeleton */}
                <div className="flex items-center gap-2 p-2">
                  <LoadingSkeleton className="flex-1 h-12 rounded-lg" />
                  <LoadingSkeleton className="h-12 w-12 rounded-lg" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const EventPageLoadingSkeleton = () => {
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center space-y-4">
        <LoadingSkeleton className="h-16 w-16 mx-auto rounded-full" />
        <LoadingSkeleton className="h-8 w-3/4 mx-auto" />
        <LoadingSkeleton className="h-4 w-full" />
        <LoadingSkeleton className="h-4 w-2/3 mx-auto" />
      </div>
    </div>
  );
};

export default LoadingSkeleton;