import { Toaster } from 'react-hot-toast';

export default function ToastContainer() {
  return (
    <Toaster 
      position="top-right" 
      reverseOrder={false}
      toastOptions={{
        // Define default options for all toasts
        duration: 3000,
        style: {
          background: 'white',
          color: '#155E75', // ink color
          borderRadius: '8px',
          border: '1px solid #d4e8ed', // film-border
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
          fontFamily: 'Zen Kaku Gothic New, sans-serif',
        },
        success: {
          iconTheme: {
            primary: '#0891B2', // film-accent
            secondary: 'white',
          },
        },
        error: {
          iconTheme: {
            primary: '#EF4444', // red-500
            secondary: 'white',
          },
        },
      }}
    />
  );
}
