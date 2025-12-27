import React from 'react';

export default function SiteFooter({
    isDarkMode,
    brand = 'SANGUI BLOG',
    copyrightText,
    icpNumber,
    icpLink = 'https://beian.miit.gov.cn/',
    poweredBy
}) {
    return (
        <footer
            className={`py-12 text-center mt-12 border-t-8 ${isDarkMode ? 'bg-gray-900 text-white border-[#FF0080]' : 'bg-black text-white border-[#FFD700]'}`}
        >
            <h2 className="text-3xl font-black italic tracking-tighter mb-3">{brand}</h2>
            {copyrightText && (
                <p className="text-sm font-mono text-gray-200">{copyrightText}</p>
            )}
            {icpNumber && (
                <a
                    href={icpLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center text-xs font-bold text-[#FFD700] underline underline-offset-4 mt-2"
                >
                    {icpNumber}
                </a>
            )}
            {poweredBy && (
                <p className="text-xs text-gray-400 font-mono mt-3">
                    {poweredBy}
                </p>
            )}
        </footer>
    );
}

