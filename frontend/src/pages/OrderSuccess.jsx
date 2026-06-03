import API_BASE_URL from '../apiConfig';
import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { CheckCircle, Truck, ArrowRight, Star, MessageSquare, X } from 'lucide-react';
import './OrderSuccess.css';

const OrderSuccess = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [orderNumber] = useState(Math.floor(100000 + Math.random() * 900000));

  // Get purchased items from navigation state
  const purchasedItems = location.state?.purchasedItems || [];
  const itemToRate = purchasedItems.length > 0 ? purchasedItems[0] : null;

  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [hover, setHover] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const user = JSON.parse(localStorage.getItem('user'));

  const handleSubmitReview = async () => {
    if (rating === 0) {
      alert('Please select at least one star.');
      return;
    }

    if (!itemToRate || !user) {
      setSubmitted(true);
      return;
    }

    setIsSubmitting(true);
    const formData = new FormData();
    formData.append('productId', itemToRate._id || itemToRate.id);
    formData.append('userEmail', user.email);
    formData.append('userName', user.name);
    formData.append('rating', rating);
    formData.append('comment', comment);

    try {
      const res = await fetch(`${API_BASE_URL}/reviews`, {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        setSubmitted(true);
      } else {
        alert('Failed to submit feedback. Please try again.');
      }
    } catch (err) {
      console.error(err);
      alert('Error submitting feedback.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="success-page">
      <div className="success-card">

        {/* ── Success Header ── */}
        <div className="os-header">
          <div className="check-container">
            <div className="check-bg-pulse"></div>
            <CheckCircle size={80} className="main-check-icon" />
          </div>
          <h1 className="success-title">Order Placed!</h1>
          <p className="success-subtitle">Order #{orderNumber}</p>
          <p className="success-note">
            We'll send you a confirmation shortly. Your order is being prepared.
          </p>
        </div>

        {/* ── Truck Animation ── */}
        <div className="animation-box">
          <div className="moving-vehicle">
            <Truck size={40} className="truck-icon" />
            <div className="speed-lines">
              <span></span><span></span><span></span>
            </div>
          </div>
        </div>

        {/* ── Action Buttons ── */}
        <div className="os-actions">
          <button className="os-btn-primary" onClick={() => navigate('/home')}>
            Continue Shopping <ArrowRight size={18} />
          </button>

          {/* Optional feedback button — only shown if there's an item to rate */}
          {itemToRate && !submitted && (
            <button
              className="os-btn-feedback"
              onClick={() => setShowFeedbackModal(true)}
            >
              <MessageSquare size={16} />
              Give Feedback (Optional)
            </button>
          )}

          {submitted && (
            <p className="os-thanks-text">✓ Thank you for your feedback!</p>
          )}
        </div>
      </div>

      {/* ── Optional Feedback Modal ── */}
      {showFeedbackModal && (
        <div className="os-modal-overlay" onClick={() => setShowFeedbackModal(false)}>
          <div className="os-modal" onClick={e => e.stopPropagation()}>
            <button className="os-modal-close" onClick={() => setShowFeedbackModal(false)}>
              <X size={20} />
            </button>

            <h3 className="os-modal-title">How was your experience?</h3>
            {itemToRate && (
              <p className="os-modal-product">
                Reviewing: <strong>{itemToRate.name}</strong>
              </p>
            )}

            {/* Star Rating */}
            <div className="os-stars">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  size={36}
                  fill={star <= (hover || rating) ? '#fbbf24' : 'none'}
                  color={star <= (hover || rating) ? '#fbbf24' : '#d1d5db'}
                  style={{ cursor: 'pointer', transition: 'all 0.15s' }}
                  onMouseEnter={() => setHover(star)}
                  onMouseLeave={() => setHover(null)}
                  onClick={() => setRating(star)}
                />
              ))}
            </div>

            {/* Comment */}
            <textarea
              className="os-textarea"
              placeholder="Write a quick comment (optional)..."
              value={comment}
              onChange={e => setComment(e.target.value)}
            />

            {/* Modal Actions */}
            <div className="os-modal-actions">
              <button
                className="os-modal-skip"
                onClick={() => setShowFeedbackModal(false)}
              >
                Skip
              </button>
              <button
                className="os-modal-submit"
                onClick={async () => {
                  await handleSubmitReview();
                  if (rating > 0) setShowFeedbackModal(false);
                }}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderSuccess;
