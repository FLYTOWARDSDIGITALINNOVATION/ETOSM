import React from 'react';
import { Link } from 'react-router-dom';
import './CollectionGrid.css';

const categories = [
  {
    id: 1,
    title: 'Electronics Components',
    subtitle: 'Active & Passive',
    icon: '⚡',
    link: '/category/Electronics Components',
    tag: 'COMPONENTS',
    color: '#1a3a5c',
  },
  {
    id: 2,
    title: 'BMS',
    subtitle: 'Hardware BMS & Smart BMS',
    icon: '🔋',
    link: '/category/BATTERY MANAGEMENT',
    tag: 'BATTERY MANAGEMENT',
    color: '#1b4332',
  },
  {
    id: 3,
    title: 'Lithium Battery Pack',
    subtitle: 'Li-ion & LiFePO₄ for UPS / EV / Solar',
    icon: '⚙️',
    link: '/category/BATTERY PACKS',
    tag: 'BATTERY PACKS',
    color: '#3d1c02',
  },
  {
    id: 4,
    title: 'Audio',
    subtitle: 'Bluetooth Receivers & Modules',
    icon: '🎵',
    link: '/category/Audio',
    tag: 'AUDIO',
    color: '#1e1b4b',
  },
];

const CollectionGrid = () => {
  return (
    <section className="etosm-categories-section">
      <div className="etosm-categories-container">
        <div className="etosm-categories-header">
          <h2 className="etosm-categories-title">Explore Our Product Categories</h2>
          <div className="etosm-title-divider"></div>
        </div>

        <div className="etosm-categories-grid">
          {categories.map((cat) => (
            <Link to={cat.link} className="etosm-category-card" key={cat.id}>
              <div className="card-tag">{cat.tag}</div>
              <div className="card-icon">{cat.icon}</div>
              <div className="card-content">
                <h3 className="card-title">{cat.title}</h3>
                <p className="card-subtitle">{cat.subtitle}</p>
              </div>
              <div className="card-arrow">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
              </div>
              <div className="card-bg-accent" style={{ background: cat.color }}></div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};

export default CollectionGrid;
