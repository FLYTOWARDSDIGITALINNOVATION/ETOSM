import React from 'react';
import './CollectionGrid.css';

// Assets
import benchCasual from '../assets/grip_bench_casual.jpg';
import comfortTech from '../assets/grip_casual.jpg';
import studioGrip from '../assets/grip_yoga.jpg';
import performanceAthletics from '../assets/grip_running.jpg';

const CollectionGrid = () => {
    return (
        <section className="collection-grid-section container">
            <div className="collection-header">
                <h2 className="collection-title">EXPLORE THE LINEUP</h2>
                <p className="collection-subtitle">Functional grip technology for every facet of your active life</p>
            </div>

            <div className="bento-grid">
                {/* Large Left Image - Lifestyle */}
                <div className="bento-item large-left">
                    <img src={benchCasual} alt="Highgrip Lifestyle" />
                    <div className="bento-overlay">
                        <span className="bento-tag">Lifestyle & Daily</span>
                    </div>
                </div>

                {/* Top Right - Comfort Tech */}
                <div className="bento-item top-right">
                    <img src={comfortTech} alt="Highgrip Comfort Technology" />
                    <div className="bento-overlay">
                        <span className="bento-category">PREMIUM<br />COMFORT TECH</span>
                    </div>
                </div>

                {/* Mid Right - Studio Focus */}
                <div className="bento-item mid-right">
                    <img src={studioGrip} alt="Highgrip Studio Excellence" />
                    <div className="bento-overlay">
                        <span className="bento-category">STUDIO &<br />PILATES</span>
                    </div>
                </div>

                {/* Bottom Wide - Performance Athletics */}
                <div className="bento-item bottom-wide">
                    <img src={performanceAthletics} alt="Highgrip Athletic Performance" />
                    <div className="bento-overlay">
                        <span className="bento-tag">Advanced Athletic Performance</span>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default CollectionGrid;
