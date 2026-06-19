export default function Footer() {
  return (
    <footer className="bg-gray-900 border-t border-gray-800 mt-16 py-8 text-center text-gray-500 text-sm">
      <p>© {new Date().getFullYear()} GamePlaza. Все права защищены.</p>
      <p className="mt-1">gameplaza.site</p>
    </footer>
  )
}