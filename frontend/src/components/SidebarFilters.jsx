import React from "react";
import { FaStar } from "react-icons/fa";
import "./SidebarFilters.css";

const SidebarFilters = ({ filters, onFilterChange, className }) => {
    const handleCheckboxChange = (category, value) => {
        const currentValues = filters[category] || [];
        const newValues = currentValues.includes(value)
            ? currentValues.filter(v => v !== value)
            : [...currentValues, value];
        onFilterChange(category, newValues);
    };

    const handlePriceChange = (e) => {
        onFilterChange("maxPrice", e.target.value);
    };

    const handleRatingClick = (rating) => {
        onFilterChange("minRating", rating === filters.minRating ? 0 : rating);
    };

    return (
        <aside className={`sidebar-filters ${className || ""}`}>

            {/* 3. Price */}
            <div className="filter-section">
                <h3>Price</h3>
                <span className="price-display">₹205 – ₹{filters.maxPrice || 1050}+</span>
                <input
                    type="range"
                    min="205"
                    max="2000"
                    step="50"
                    value={filters.maxPrice || 1050}
                    onChange={handlePriceChange}
                    className="range-slider"
                />
                <div className="price-ranges">
                    <span className="price-range-link" onClick={() => onFilterChange("maxPrice", 400)}>Up to ₹400</span>
                    <span className="price-range-link" onClick={() => { onFilterChange("minPrice", 400); onFilterChange("maxPrice", 500); }}>₹400 - ₹500</span>
                    <span className="price-range-link" onClick={() => onFilterChange("minPrice", 500)}>Over ₹500</span>
                </div>
            </div>

            {/* 4. Customer Review */}
            <div className="filter-section">
                <h3>Customer Review</h3>
                <div className="rating-filters">
                    {[4, 3, 2, 1].map((star) => (
                        <div
                            key={star}
                            className={`rating-link ${filters.minRating === star ? "active" : ""}`}
                            onClick={() => handleRatingClick(star)}
                        >
                            <div className="stars-row">
                                {[...Array(5)].map((_, i) => (
                                    <FaStar key={i} color={i < star ? "#fbbf24" : "#e5e7eb"} />
                                ))}
                            </div>
                            <span>& Up</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* 5. Pay On Delivery */}
            <div className="filter-section">
                <h3>Pay On Delivery</h3>
                <label className="filter-option">
                    <input
                        type="checkbox"
                        checked={filters.payOnDelivery}
                        onChange={(e) => onFilterChange("payOnDelivery", e.target.checked)}
                    />
                    Eligible for Pay On Delivery
                </label>
            </div>
        </aside>
    );
};

export default SidebarFilters;
