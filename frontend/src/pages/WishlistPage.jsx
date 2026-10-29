import React from 'react';
import { Link } from 'react-router-dom';
import { useWishlist } from '../context/WishlistContext';
import ProductCard from '../components/ProductCard';
import Header from '../components/Header';
import { ChevronLeft, Heart } from "lucide-react"; 
import './WishlistPage.css';

const WishlistPage = () => {
  const { wishlist } = useWishlist();

  return (
    <div className="wishlist-page-wrapper">
      <Header />
      
      <main className="wishlist-main container">
        {/* Navigation Breadcrumb */}
        

<div className="back-btn-container reveal-fade">
  <Link to="/" className="classic-boutique-btn">
    <ChevronLeft size={14} strokeWidth={3} /> 
    <span>Back to Shop</span>
  </Link>
</div>
        {wishlist.length === 0 ? (
          <div className="empty-state-container reveal-up">
            <div className="icon-aesthetic-circle">
               <Heart className="floating-heart-icon" size={40} />
            </div>
            
            <h2 className="luxury-title">The Gallery of Love</h2>
            <p className="luxury-subtitle">
              Your wishlist is currently a blank canvas. Start curating <br /> 
              your favorite high-grip essentials for your collection.
            </p>

            <Link to="/" className="shop-collection-btn">
               Explore Collection
            </Link>
          </div>
        ) : (
          <div className="wishlist-filled-area">
            <h1 className="editorial-title reveal-fade">
              My Favorites <span className="item-count">/ {wishlist.length} items</span>
            </h1>
            
            <div className="products-staggered-grid">
              {wishlist.map((product, index) => (
                <div 
                  key={product.id || product.productId} 
                  className="grid-item-reveal" 
                  style={{ "--item-index": index }}
                >
                  <ProductCard product={product} />
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default WishlistPage;