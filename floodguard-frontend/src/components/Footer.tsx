import { useEffect, useState } from 'react'

type FooterProps = {
  scrollContainer?: React.RefObject<HTMLElement | null>
  threshold?: number
}

export default function Footer({ scrollContainer, threshold = 120 }: FooterProps) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    function getScrollTop() {
      if (scrollContainer?.current) return scrollContainer.current.scrollTop
      return window.scrollY
    }

    function onScroll() {
      setVisible(getScrollTop() > threshold)
    }

    const target: EventTarget = scrollContainer?.current ?? window
    target.addEventListener('scroll', onScroll, { passive: true } as AddEventListenerOptions)
    onScroll()
    return () => target.removeEventListener('scroll', onScroll)
  }, [scrollContainer, threshold])

  return (
    <footer
      aria-label="Award credits"
      className={`fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200/60 bg-white/95 dark:border-slate-800/60 dark:bg-slate-950/95 backdrop-blur py-3 px-4 text-center transition-all duration-500 ${
        visible ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 translate-y-4 pointer-events-none'
      }`}
    >
      <p className="text-xs text-slate-400 dark:text-slate-500 leading-relaxed">
        FloodGuard was awarded 🏆 Best Overall // 1st Prize Winner at ShellHacks 2025
      </p>
      <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500 leading-relaxed">
        Made with love &amp; care, by Ubaid &amp; Christina at{' '}
        <a
          href="https://www.dynelabs.org"
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-slate-500 dark:hover:text-slate-400 transition-colors"
        >
          Dyne Labs
        </a>{' '}
        © 2025
      </p>
    </footer>
  )
}
