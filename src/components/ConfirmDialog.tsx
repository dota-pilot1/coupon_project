'use client'

import { createContext, useContext, useState, useCallback, useRef } from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

type DialogOptions = {
  title?: string
  description: string
  confirmText?: string
  cancelText?: string
  type?: 'confirm' | 'alert'
}

type ConfirmContextType = {
  confirm: (options: DialogOptions) => Promise<boolean>
  alert: (message: string, title?: string) => Promise<void>
}

const ConfirmContext = createContext<ConfirmContextType | null>(null)

export function useConfirmDialog() {
  const ctx = useContext(ConfirmContext)
  if (!ctx) throw new Error('useConfirmDialog must be used within ConfirmProvider')
  return ctx
}

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  const [options, setOptions] = useState<DialogOptions>({
    description: '',
  })
  const resolveRef = useRef<((value: boolean) => void) | null>(null)

  const confirm = useCallback((opts: DialogOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setOptions({ ...opts, type: opts.type || 'confirm' })
      setOpen(true)
      resolveRef.current = resolve
    })
  }, [])

  const alertFn = useCallback((message: string, title?: string): Promise<void> => {
    return new Promise((resolve) => {
      setOptions({
        title: title || '알림',
        description: message,
        confirmText: '확인',
        type: 'alert',
      })
      setOpen(true)
      resolveRef.current = () => resolve()
    })
  }, [])

  const handleConfirm = () => {
    setOpen(false)
    resolveRef.current?.(true)
  }

  const handleCancel = () => {
    setOpen(false)
    resolveRef.current?.(false)
  }

  const isAlert = options.type === 'alert'

  return (
    <ConfirmContext.Provider value={{ confirm, alert: alertFn }}>
      {children}
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{options.title || '확인'}</AlertDialogTitle>
            <AlertDialogDescription className="whitespace-pre-line">
              {options.description}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            {!isAlert && (
              <AlertDialogCancel onClick={handleCancel}>
                {options.cancelText || '취소'}
              </AlertDialogCancel>
            )}
            <AlertDialogAction onClick={handleConfirm}>
              {options.confirmText || '확인'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ConfirmContext.Provider>
  )
}
