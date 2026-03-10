import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import type { DocFolder, DocPost, DocBlock } from '../model/types'

export function useDocFolders() {
    return useQuery<DocFolder[]>({
        queryKey: ['docFolders'],
        queryFn: () => fetch('/api/docs/folders').then((r) => r.json()),
    })
}

export function useDocPosts(folderId: number | null) {
    return useQuery<DocPost[]>({
        queryKey: ['docPosts', folderId],
        queryFn: () => fetch(`/api/docs/posts?folderId=${folderId}`).then((r) => r.json()),
        enabled: !!folderId,
    })
}

export function useDocPostDetail(postId: number | null, isEditing: boolean) {
    return useQuery<DocPost>({
        queryKey: ['docPost', postId],
        queryFn: () => fetch(`/api/docs/posts/${postId}`).then((r) => r.json()),
        enabled: !!postId && !isEditing,
    })
}

export function useSavePostMutation(selectedFolderId: number | null, selectedPostId: number | null, onSuccessCallback: (id: number) => void) {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: (data: { id?: number; folderId: number; title: string; blocks: DocBlock[] }) => {
            if (data.id) {
                return fetch(`/api/docs/posts/${data.id}`, {
                    method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data),
                }).then((r) => r.json())
            }
            return fetch('/api/docs/posts', {
                method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data),
            }).then((r) => r.json())
        },
        onSuccess: (result) => {
            if (selectedFolderId) {
                queryClient.invalidateQueries({ queryKey: ['docPosts', selectedFolderId] })
            }
            const newId = result.id || selectedPostId
            if (newId) {
                queryClient.invalidateQueries({ queryKey: ['docPost', Number(newId)] })
                onSuccessCallback(Number(newId))
            }
            toast.success('저장되었습니다.')
        },
    })
}

export function useDeletePostMutation(selectedFolderId: number | null, onSuccessCallback: () => void) {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: (id: number) => fetch(`/api/docs/posts/${id}`, { method: 'DELETE' }).then((r) => r.json()),
        onSuccess: () => {
            if (selectedFolderId) queryClient.invalidateQueries({ queryKey: ['docPosts', selectedFolderId] })
            onSuccessCallback()
            toast.success('삭제되었습니다.')
        },
    })
}

export function useCreateFolderMutation(onSuccessCallback: (parentId: number | null) => void) {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: (data: { name: string; parentId: number | null }) =>
            fetch('/api/docs/folders', {
                method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data),
            }).then((r) => r.json()),
        onSuccess: (created: DocFolder) => {
            queryClient.invalidateQueries({ queryKey: ['docFolders'] })
            onSuccessCallback(created.parentId)
            toast.success('폴더가 생성되었습니다.')
        },
    })
}

export function useRenameFolderMutation(onSuccessCallback: () => void) {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: (data: { id: number; name: string }) =>
            fetch(`/api/docs/folders/${data.id}`, {
                method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: data.name }),
            }).then((r) => r.json()),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['docFolders'] })
            onSuccessCallback()
            toast.success('폴더명이 수정되었습니다.')
        },
    })
}

export function useDeleteFolderMutation(onSuccessCallback: () => void) {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: (id: number) => fetch(`/api/docs/folders/${id}`, { method: 'DELETE' }).then((r) => r.json()),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['docFolders'] })
            onSuccessCallback()
            toast.success('폴더가 삭제되었습니다.')
        },
    })
}
