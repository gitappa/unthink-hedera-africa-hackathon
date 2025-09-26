import React from 'react';

interface ViewCollectionLinkProps {
  userName: string;
  storeName: string;
}

const ViewCollectionLink: React.FC<ViewCollectionLinkProps> = ({ userName, storeName }) => {
  const collectionUrl = `https://unthink-ui-gatsby-${storeName}-ui-314035436999.us-central1.run.app/influencer/${encodeURIComponent(userName)}`;

  return (
    <div className="mb-4 flex justify-center">
      <a
        href={collectionUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 px-4 py-2 text-sm text-blue-600 hover:text-blue-700 border border-blue-200 hover:border-blue-300 rounded-md transition-colors duration-200 hover:bg-blue-50 bg-white shadow-sm"
      >
        <span>View Collection</span>
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
        </svg>
      </a>
    </div>
  );
};

export default ViewCollectionLink;
