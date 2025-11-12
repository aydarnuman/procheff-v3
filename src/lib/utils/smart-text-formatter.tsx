/**
 * Smart Text Formatter
 * Formats raw text with intelligent detection of:
 * - Headings (ALL CAPS)
 * - Numbered lists
 * - Bullet lists
 * - MADDE format
 * - Paragraphs
 */

'use client';

import React from 'react';

export function formatSmartText(text: string): React.ReactElement | null {
  if (!text) return null;

  const lines = text.split('\n');
  const elements: React.ReactElement[] = [];
  let currentList: { type: 'ol' | 'ul'; items: string[] } | null = null;
  let currentParagraph: string[] = [];
  let lineIndex = 0;

  const flushParagraph = () => {
    if (currentParagraph.length > 0) {
      const content = currentParagraph.join(' ').trim();
      if (content) {
        elements.push(
          <p key={`p-${lineIndex}`} className="mb-3 text-gray-300 leading-relaxed">
            {content}
          </p>
        );
      }
      currentParagraph = [];
    }
  };

  const flushList = () => {
    if (currentList && currentList.items.length > 0) {
      const ListTag = currentList.type === 'ol' ? 'ol' : 'ul';
      elements.push(
        <ListTag
          key={`list-${lineIndex}`}
          className={`mb-4 ml-6 space-y-2 ${
            currentList.type === 'ol' ? 'list-decimal' : 'list-disc'
          } text-gray-300`}
        >
          {currentList.items.map((item, idx) => (
            <li key={idx} className="leading-relaxed">
              {item}
            </li>
          ))}
        </ListTag>
      );
      currentList = null;
    }
  };

  for (let i = 0; i < lines.length; i++) {
    lineIndex = i;
    const line = lines[i].trim();

    // Empty line - end of paragraph/list
    if (!line) {
      flushParagraph();
      flushList();
      continue;
    }

    // Heading detection (ALL CAPS, 10-100 chars, Turkish chars allowed)
    const isHeading =
      line.length >= 10 &&
      line.length <= 100 &&
      line === line.toUpperCase() &&
      /^[A-ZÇĞİÖŞÜ0-9\s:.-]+$/.test(line);

    if (isHeading) {
      flushParagraph();
      flushList();
      elements.push(
        <h3
          key={`h-${i}`}
          className="text-cyan-400 font-bold text-base mb-3 mt-4 first:mt-0"
        >
          {line}
        </h3>
      );
      continue;
    }

    // Numbered list detection (1., 2., 3. or 1) 2) 3))
    const numberedMatch = line.match(/^(\d+)[.):]\s+(.+)$/);
    if (numberedMatch) {
      flushParagraph();
      if (!currentList || currentList.type !== 'ol') {
        flushList();
        currentList = { type: 'ol', items: [] };
      }
      currentList.items.push(numberedMatch[2]);
      continue;
    }

    // Bullet list detection (-, •, *, →)
    const bulletMatch = line.match(/^[-•*→]\s+(.+)$/);
    if (bulletMatch) {
      flushParagraph();
      if (!currentList || currentList.type !== 'ul') {
        flushList();
        currentList = { type: 'ul', items: [] };
      }
      currentList.items.push(bulletMatch[1]);
      continue;
    }

    // MADDE format (MADDE 1:, MADDE 2:, etc.)
    const maddeMatch = line.match(/^(MADDE\s+\d+[.:]?\s*.*?)$/i);
    if (maddeMatch) {
      flushParagraph();
      flushList();
      elements.push(
        <h4
          key={`madde-${i}`}
          className="text-emerald-400 font-semibold text-sm mb-2 mt-3"
        >
          {line}
        </h4>
      );
      continue;
    }

    // Normal paragraph line
    currentParagraph.push(line);
  }

  // Flush remaining
  flushParagraph();
  flushList();

  return <div className="space-y-1">{elements}</div>;
}

