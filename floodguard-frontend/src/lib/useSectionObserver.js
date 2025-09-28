import { useEffect, useMemo, useState } from 'react'

export function useSectionObserver(sectionIds = []) {
  const [activeId, setActiveId] = useState(sectionIds[0] ?? null)

  const ids = useMemo(() => sectionIds.filter(Boolean), [sectionIds])

  useEffect(() => {
    if (ids.length === 0) return

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)
        if (visible.length > 0) {
          setActiveId(visible[0].target.id)
        }
      },
      { rootMargin: '-40% 0px -40% 0px', threshold: [0.1, 0.25, 0.5, 0.75] }
    )

    ids.forEach((id) => {
      const element = document.getElementById(id)
      if (element) {
        observer.observe(element)
      }
    })

    return () => observer.disconnect()
  }, [ids])

  return [activeId, setActiveId]
}

