"use client";

import { SearchResult } from "@/types";
import { ExternalLink, Star, Music } from "lucide-react";

interface ResultCardProps {
  result: SearchResult;
}

export default function ResultCard({ result }: ResultCardProps) {
  const { metadata } = result;

  // Web result
  if (metadata.url && !metadata.track_name && !metadata.poster_path) {
    return (
      <a
        href={metadata.url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex-shrink-0 w-[280px] bg-[#2f2f2f] rounded-xl p-3.5 hover:bg-[#3a3a3a] transition-colors group"
      >
        <div className="flex items-start justify-between gap-2">
          <h4 className="text-sm font-medium text-white line-clamp-2 group-hover:text-purple-400 transition-colors">
            {metadata.title || "Untitled"}
          </h4>
          <ExternalLink size={14} className="text-gray-500 shrink-0 mt-0.5" />
        </div>
        <p className="text-xs text-gray-500 mt-1 truncate">{metadata.url}</p>
        <p className="text-xs text-gray-400 mt-2 line-clamp-2">
          {metadata.description || result.content.slice(0, 120)}
        </p>
      </a>
    );
  }

  // Film result
  if (metadata.poster_path) {
    const posterUrl = metadata.poster_path.startsWith("http")
      ? metadata.poster_path
      : `https://image.tmdb.org/t/p/w200${metadata.poster_path}`;
    return (
      <div className="flex-shrink-0 w-[180px] bg-[#2f2f2f] rounded-xl overflow-hidden hover:bg-[#3a3a3a] transition-colors">
        <div className="h-[200px] bg-[#1a1a1a] overflow-hidden">
          <img
            src={posterUrl}
            alt={metadata.title || "Film"}
            className="w-full h-full object-cover"
          />
        </div>
        <div className="p-3">
          <h4 className="text-sm font-medium text-white line-clamp-1">
            {metadata.title || "Untitled"}
          </h4>
          {metadata.vote_average != null && (
            <div className="flex items-center gap-1 mt-1">
              <Star size={12} className="text-amber-400 fill-amber-400" />
              <span className="text-xs text-gray-400">
                {Number(metadata.vote_average).toFixed(1)}
              </span>
            </div>
          )}
          {metadata.release_date && (
            <p className="text-xs text-gray-500 mt-0.5">{metadata.release_date}</p>
          )}
        </div>
      </div>
    );
  }

  // Music result
  if (metadata.track_name || metadata.spotify_url) {
    return (
      <a
        href={metadata.spotify_url || "#"}
        target="_blank"
        rel="noopener noreferrer"
        className="flex-shrink-0 w-[240px] bg-[#2f2f2f] rounded-xl p-3.5 hover:bg-[#3a3a3a] transition-colors group"
      >
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center">
            <Music size={16} className="text-green-400" />
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="text-sm font-medium text-white truncate group-hover:text-green-400 transition-colors">
              {metadata.track_name || "Unknown Track"}
            </h4>
            <p className="text-xs text-gray-400 truncate">
              {metadata.artist_name || "Unknown Artist"}
            </p>
          </div>
        </div>
        {metadata.album_name && (
          <p className="text-xs text-gray-500 truncate">{metadata.album_name}</p>
        )}
      </a>
    );
  }

  // Fallback
  return (
    <div className="flex-shrink-0 w-[260px] bg-[#2f2f2f] rounded-xl p-3.5">
      <p className="text-sm text-gray-300 line-clamp-3">{result.content.slice(0, 150)}</p>
    </div>
  );
}
