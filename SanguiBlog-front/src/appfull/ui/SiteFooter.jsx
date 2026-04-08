import React from 'react';

export default function SiteFooter({
    isDarkMode,
    brand = 'SANGUI BLOG',
    copyrightText,
    icpNumber,
    icpLink = 'https://beian.miit.gov.cn/',
    poweredBy
}) {
    const borderClass = isDarkMode ? 'border-white/10' : 'border-slate-900/10';
    const brandClass = isDarkMode ? 'text-slate-100' : 'text-slate-900';
    const metaTextClass = isDarkMode ? 'text-slate-400' : 'text-slate-500';
    const linkClass = isDarkMode
        ? 'text-slate-300 hover:text-slate-100'
        : 'text-slate-600 hover:text-slate-900';

    return (
        <footer className="px-4 pt-16 pb-14">
            <div className={`mx-auto max-w-5xl border-t ${borderClass}`}>
                <div className="flex flex-col items-center gap-4 pt-8 text-center md:pt-10">
                    <div className={`text-[11px] font-semibold uppercase tracking-[0.28em] ${metaTextClass}`}>
                        End Of Page
                    </div>
                    <h2 className={`text-xl font-black tracking-[-0.04em] md:text-2xl ${brandClass}`}>{brand}</h2>
                    {copyrightText && (
                        <p className={`max-w-3xl text-sm leading-7 ${metaTextClass}`}>{copyrightText}</p>
                    )}
                    {icpNumber && (
                        <a
                            href={icpLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`inline-flex items-center justify-center text-xs font-medium tracking-[0.14em] underline decoration-current/30 underline-offset-4 transition-colors ${linkClass}`}
                        >
                            {icpNumber}
                        </a>
                    )}
                    {poweredBy && (
                        <p className={`text-xs tracking-[0.14em] ${metaTextClass}`}>
                            {poweredBy}
                        </p>
                    )}
                </div>
            </div>
        </footer>
    );
}
