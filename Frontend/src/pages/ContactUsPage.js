import React, { useState } from 'react';
import Footer from '../components/common/Footer';
import emailjs from '@emailjs/browser'; // Import EmailJS

const ContactUsPage = ({ onNavigate }) => {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        feedback: '',
        callback: false,
    });
    const [errors, setErrors] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prevState => ({
            ...prevState,
            [name]: type === 'checkbox' ? checked : value,
        }));
        if (name === 'phone' && value) {
            setErrors(prevErrors => ({ ...prevErrors, phone: null }));
        }
    };

    const validateForm = () => {
        const newErrors = {};
        if (formData.callback && !formData.phone.trim()) {
            newErrors.phone = 'Phone number is required for a callback request.';
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!validateForm()) {
            return;
        }
        
        setIsSubmitting(true);

        const serviceId = process.env.REACT_APP_EMAILJS_SERVICE_ID;
        const templateId = process.env.REACT_APP_EMAILJS_TEMPLATE_ID;
        const publicKey = process.env.REACT_APP_EMAILJS_PUBLIC_KEY;

        const templateParams = {
            ...formData,
            callback: formData.callback ? 'Yes' : 'No',
        };

        emailjs.send(serviceId, templateId, templateParams, publicKey)
            .then((response) => {
               console.log('SUCCESS!', response.status, response.text);
               alert('Thank you for your feedback! We will get back to you soon.');
               setFormData({
                   name: '',
                   email: '',
                   phone: '',
                   feedback: '',
                   callback: false,
               });
            })
            .catch((err) => {
               console.error('FAILED...', err);
               alert('Sorry, something went wrong. Please try again later.');
            })
            .finally(() => {
                setIsSubmitting(false);
            });
    };

    return (
        <div className="page-container" style={{ minHeight: 'calc(100vh - 145px)' }}>
            <section className="about-project-section">
                <h2 className="section-title">Contact Us</h2>
                <p className="section-text">
                    Have a question or some feedback? Fill out the form below to get in touch with our team.
                </p>

                <div className="form-container">
                    <form className="contact-form" onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label htmlFor="name">Name <span className="mandatory-star">*</span></label>
                            <input type="text" id="name" name="name" className="form-input" value={formData.name} onChange={handleChange} required />
                        </div>
                        <div className="form-group">
                            <label htmlFor="email">Email Address <span className="mandatory-star">*</span></label>
                            <input type="email" id="email" name="email" className="form-input" value={formData.email} onChange={handleChange} required />
                        </div>
                        <div className="form-group">
                            <label htmlFor="phone">Phone Number {formData.callback ? <span className="mandatory-star">*</span> : '(Optional)'}</label>
                            <input type="tel" id="phone" name="phone" className={`form-input ${errors.phone ? 'input-error' : ''}`} value={formData.phone} onChange={handleChange} />
                            {errors.phone && <span className="error-text">{errors.phone}</span>}
                        </div>
                        <div className="form-group">
                            <label htmlFor="feedback">Feedback or Question <span className="mandatory-star">*</span></label>
                            <textarea id="feedback" name="feedback" rows="5" className="form-textarea" value={formData.feedback} onChange={handleChange} required></textarea>
                        </div>
                        <div className="form-checkbox-group">
                            <input type="checkbox" id="callback" name="callback" checked={formData.callback} onChange={handleChange} />
                            <label htmlFor="callback">Please call me back</label>
                        </div>
                        <button type="submit" className="action-button form-submit-button" disabled={isSubmitting}>
                            {isSubmitting ? 'Sending...' : 'Submit Feedback'}
                        </button>
                    </form>
                </div>
            </section>

            <div className="location-container">
                <div className="address-details">
                    <h3>Our Office</h3>
                    <p><strong>PaperTrail Headquarters</strong></p>
                    <p>Archimedes Hostel, Chitkara University</p>
                    <p>Rajpura, Punjab, 140401</p>
                    <p>India</p>
                    <p><strong>Email:</strong> support@papertrail.com</p>
                    <p><strong>Phone:</strong> +91 (141) 555-0123</p>
                </div>
                <div className="map-iframe">
                    <iframe
                        src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3437.1751352098304!2d76.65720287536413!3d30.51608647468947!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x390fc32344a6e2d7%3A0x81b346dee91799ca!2sChitkara%20University!5e0!3m2!1sen!2sin!4v1755640725715!5m2!1sen!2sin"
                        width="100%"
                        height="100%"
                        style={{ border: 0, borderRadius: '12px' }}
                        allowFullScreen=""
                        loading="lazy"
                        referrerPolicy="no-referrer-when-downgrade"
                        title="Jaipur Office Location"
                    ></iframe>
                </div>
            </div>

            <Footer onNavigate={onNavigate} />
        </div>
    );
};

export default ContactUsPage;