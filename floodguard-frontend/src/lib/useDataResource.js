import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from './api.js'

export function useDataResource(path, { autoLoad = true } = {}) {
  const [data, setData] = useState([])
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState(null)
  const isMounted = useRef(true)

  useEffect(() => {
    return () => {
      isMounted.current = false
    }
  }, [])

  const load = useCallback(async () => {
    setStatus('loading')
    setError(null)
    try {
      const res = await api.get(path)
      if (isMounted.current) {
        setData(res.data || [])
        setStatus('ready')
      }
    } catch (err) {
      if (isMounted.current) {
        setError(err)
        setStatus('error')
      }
    }
  }, [path])

  useEffect(() => {
    if (autoLoad) {
      load()
    }
  }, [autoLoad, load])

  return {
    data,
    status,
    error,
    refresh: load,
    setData,
  }
}

