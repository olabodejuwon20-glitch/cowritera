export default function SupportButton() {
  return (
    <a
      href="https://wa.link/vg9fhh"
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Contact support on WhatsApp"
      className="fixed right-4 bottom-24 z-50 inline-flex items-center justify-center h-12 w-12 rounded-full bg-emerald-500 text-white shadow-[var(--shadow-elegant)] hover:scale-105 transition-transform"
    >
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
        <path d="M20.52 3.48A11.83 11.83 0 0 0 12 .5C6.84.5 2.5 4.84 2.5 10c0 1.74.46 3.37 1.26 4.8L2 22l6.44-1.66A11.78 11.78 0 0 0 12 20.5c5.16 0 9.5-4.34 9.5-9.5 0-1.98-.59-3.82-1.48-5.52zM12 18c-.94 0-1.86-.25-2.66-.72l-.19-.11-3.83.99.98-3.73-.12-.2A7.5 7.5 0 1 1 19.5 10 7.48 7.48 0 0 1 12 18z" />
        <path d="M16.14 13.31c-.27-.14-1.59-.79-1.83-.88-.24-.09-.42-.14-.6.14s-.69.88-.86 1.06c-.16.19-.33.21-.6.07-.27-.14-1.14-.42-2.17-1.34-.8-.71-1.34-1.59-1.5-1.86-.16-.27-.02-.41.12-.55.12-.12.27-.31.41-.46.14-.15.19-.25.3-.41.1-.16.05-.31-.02-.45-.07-.14-.6-1.44-.82-1.98-.22-.52-.44-.45-.6-.46-.16-.01-.34-.01-.52-.01-.18 0-.45.07-.68.31-.24.24-.92.9-.92 2.2 0 1.29.94 2.54 1.07 2.72.12.18 1.84 2.95 4.46 4.17 2.62 1.22 2.62.81 3.09.76.47-.05 1.53-.62 1.75-1.22.22-.6.22-1.11.15-1.22-.07-.11-.27-.17-.57-.31z" />
      </svg>
    </a>
  );
}
