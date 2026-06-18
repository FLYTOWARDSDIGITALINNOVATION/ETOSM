import React from 'react';
import { Printer, X } from 'lucide-react';
import './OrderReceipt.css';

const OrderReceipt = ({ order, items, onClose }) => {
    if (!order) return null;

    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="receipt-overlay">
            <div className="receipt-modal">
                <div className="receipt-header-actions no-print">
                    <button className="print-btn" onClick={handlePrint}>
                        <Printer size={18} /> Print Slip
                    </button>
                    <button className="close-btn" onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>

                <div className="receipt-content" id="printable-receipt">
                    <div className="receipt-brand">
                        <h1>Etosm</h1>
                        <p>Order Payment Slip</p>
                    </div>

                    <div className="receipt-meta">
                        <div className="meta-group">
                            <strong>Order Date:</strong>
                            <span>{new Date().toLocaleDateString()}</span>
                        </div>
                        <div className="meta-group">
                            <strong>Order ID:</strong>
                            <span>#PENDING</span>
                        </div>
                    </div>

                    <hr />

                    <div className="receipt-section">
                        <h3>Shipping Details</h3>
                        <p><strong>Name:</strong> {order.shippingAddress.firstName} {order.shippingAddress.lastName}</p>
                        <p><strong>Email:</strong> {order.shippingAddress.email}</p>
                        <p><strong>Phone:</strong> {order.shippingAddress.phone}</p>
                        <p><strong>Address:</strong> {order.shippingAddress.address}</p>
                        <p><strong>Method:</strong> {order.shippingMethod.toUpperCase()}</p>
                    </div>

                    <div className="receipt-section">
                        <h3>Payment Details</h3>
                        <p><strong>Method:</strong> {order.paymentMethod.toUpperCase()}</p>
                    </div>

                    <div className="receipt-section">
                        <h3>Order Items</h3>
                        <table className="receipt-table">
                            <thead>
                                <tr>
                                    <th>Product</th>
                                    <th>Qty</th>
                                    <th>Price</th>
                                </tr>
                            </thead>
                            <tbody>
                                {items.map((item, index) => (
                                    <tr key={index}>
                                        <td>
                                            {item.name}
                                            {item.variation && <span style={{ display: 'block', fontSize: '12px', color: '#666' }}>Size: {item.variation}</span>}
                                        </td>
                                        <td>{item.qty}</td>
                                        <td>₹{(item.price * item.qty).toFixed(2)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="receipt-summary">
                        <div className="summary-line">
                            <span>Subtotal:</span>
                            <span>₹{order.subtotal?.toFixed(2)}</span>
                        </div>
                        <div className="summary-line">
                            <span>Shipping:</span>
                            <span>{order.shippingCost === 0 ? "FREE" : `₹${order.shippingCost.toFixed(2)}`}</span>
                        </div>
                        <div className="summary-line">
                            <span>GST:</span>
                            <span>₹{order.tax?.toFixed(2)}</span>
                        </div>
                        <hr />
                        <div className="summary-line total">
                            <span>Total:</span>
                            <span>₹{order.totalAmount?.toFixed(2)}</span>
                        </div>
                    </div>

                    <div className="receipt-footer">
                        <p>Thank you for shopping with us!</p>
                        <small>This is a computer-generated document.</small>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default OrderReceipt;
