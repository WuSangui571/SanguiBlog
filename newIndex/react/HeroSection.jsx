import React, { useState, useEffect, useRef } from 'react';
import './HeroSection.css'; // 样式文件见下方

const HeroSection = () => {
  const [isDark, setIsDark] = useState(false);
  const heroWrapRef = useRef(null);
  const bgImgRef = useRef(null);
  const orbRef = useRef(null);

  // 主题切换
  const toggleTheme = () => {
    setIsDark(!isDark);
    document.documentElement.setAttribute('data-theme', isDark ? 'light' : 'dark');
  };

  // 视差动效处理逻辑
  useEffect(() => {
    const handleMouseMove = (e) => {
      const { clientX, clientY } = e;
      const x = (window.innerWidth / 2 - clientX) / 100;
      const y = (window.innerHeight / 2 - clientY) / 100;

      // 使用 requestAnimationFrame 确保动画流畅且不阻塞渲染
      requestAnimationFrame(() => {
        if (bgImgRef.current) {
          bgImgRef.current.style.transform = `scale(1.05) translate(${x}px, ${y}px)`;
        }
        if (heroWrapRef.current) {
          heroWrapRef.current.style.transform = `translate(${-x}px, ${-y}px)`;
        }
        if (orbRef.current) {
          orbRef.current.style.transform = `translate(${x * 2}px, ${y * 2}px)`;
        }
      });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <div className="page-wrapper">
      {/* 背景层 */}
      <div className="bg-image-layer" ref={bgImgRef} style={{ backgroundImage: `url('/bg.jpg')` }} />
      <div className="orb" ref={orbRef} />

      {/* 顶部导航 */}
      <nav className="nav-container">
        <div className="nav-brand">
          <h2>三桂博客</h2>
          <span className="version">V2.2.5</span>
        </div>
        
        <ul className="nav-links">
          <li><a href="#" className="active">首页</a></li>
          <li><a href="#archive">归档</a></li>
          <li><a href="#tools">工具</a></li>
          <li><a href="#about">关于</a></li>
        </ul>

        <button className="theme-toggle" onClick={toggleTheme}>
          {isDark ? 'LIGHT MODE' : 'DARK MODE'}
        </button>
      </nav>

      {/* Hero 主体 */}
      <main className="hero">
        <div className="hero-inner" ref={heroWrapRef}>
          <span className="intro-text">Hello, I am Sangui</span>
          <h1>
            <span>在这里把问题想清楚，</span>
            <span>把代码写简单。</span>
          </h1>

          <div className="explore-btn-wrap">
            <a href="#content" className="explore-btn">
              <span>向下探索内容</span>
              <span className="arrow-icon">↓</span>
            </a>
          </div>
        </div>
      </main>

      {/* 文章锚点区域 */}
      <section id="content" className="content-section">
        <h2 className="section-title">ARCHIVES / 归档</h2>
        <div className="content-placeholder">
          <p>设计不仅是视觉的堆砌，更是逻辑的延展。在这里，我记录下关于 AI、Java 工程化以及对简洁架构的执着追求。</p>
          <p className="quote">“Simplicity is the ultimate sophistication.”</p>
        </div>
      </section>
    </div>
  );
};

export default HeroSection;