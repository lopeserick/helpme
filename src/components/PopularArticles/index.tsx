import React from 'react';

interface PopularArticlesProps {
  articles: string[];
}

const PopularArticles: React.FC<PopularArticlesProps> = ({ articles }) => {
  return (
    <div className="bg-white rounded-xl p-8 shadow-md">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">
        Artigos Mais Acessados
      </h2>
      <div className="space-y-4">
        {articles.map((article, index) => (
          <div
            key={index}
            className="flex items-center p-4 hover:bg-gray-50 rounded-lg cursor-pointer transition"
          >
            <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-semibold mr-4">
              {index + 1}
            </div>
            <span className="text-gray-700 text-lg">{article}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PopularArticles;
