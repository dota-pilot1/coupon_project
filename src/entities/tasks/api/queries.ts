import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import type { TaskFolder, TaskPost, TaskBlock } from '../model/types'

export function useTaskFolders() {
    return useQuery<TaskFolder[]>({
        queryKey: ['taskFolders'],
        queryFn: () => fetch('/api/tasks/folders').then((r) => r.json()),
    })
}

export function useTaskPosts(folderId: number | null) {
    return useQuery<TaskPost[]>({
        queryKey: ['taskPosts', folderId],
        queryFn: () => fetch(`/api/tasks/posts?folderId=${folderId}`).then((r) => r.json()),
        enabled: !!folderId,
    })
}

export function useTaskPostDetail(postId: number | null, isEditing: boolean) {
    return useQuery<TaskPost>({
        queryKey: ['taskPost', postId],
        queryFn: () => fetch(`/api/tasks/posts/${postId}`).then((r) => r.json()),
        enabled: !!postId && !isEditing,
    })
}

export function useSaveTaskMutation(selectedFolderId: number | null, selectedPostId: number | null, onSuccessCallback: (id: number) => void) {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: (data: { id?: number; folderId: number; title: string; blocks: TaskBlock[] }) => {
            if (data.id) {
                return fetch(`/api/tasks/posts/${data.id}`, {
                    method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data),
                }).then((r) => r.json())
            }
            return fetch('/api/tasks/posts', {
                method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data),
            }).then((r) => r.json())
        },
        onSuccess: (result) => {
            if (selectedFolderId) {
                queryClient.invalidateQueries({ queryKey: ['taskPosts', selectedFolderId] })
            }
            const newId = result.id || selectedPostId
            if (newId) {
                queryClient.invalidateQueries({ queryKey: ['taskPost', Number(newId)] })
                onSuccessCallback(Number(newId))
            }
            toast.success('저장되었습니다.')
        },
    })
}

export function useDeleteTaskMutation(selectedFolderId: number | null, onSuccessCallback: () => void) {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: (id: number) => fetch(`/api/tasks/posts/${id}`, { method: 'DELETE' }).then((r) => r.json()),
        onSuccess: () => {
            if (selectedFolderId) queryClient.invalidateQueries({ queryKey: ['taskPosts', selectedFolderId] })
            onSuccessCallback()
            toast.success('삭제되었습니다.')
        },
    })
}

export function useCreateTaskFolderMutation(onSuccessCallback: (parentId: number | null) => void) {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: (data: { name: string; parentId: number | null }) =>
            fetch('/api/tasks/folders', {
                method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data),
            }).then((r) => r.json()),
        onSuccess: (created: TaskFolder) => {
            queryClient.invalidateQueries({ queryKey: ['taskFolders'] })
            onSuccessCallback(created.parentId)
            toast.success('폴더가 생성되었습니다.')
        },
    })
}

export function useRenameTaskFolderMutation(onSuccessCallback: () => void) {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: (data: { id: number; name: string }) =>
            fetch(`/api/tasks/folders/${data.id}`, {
                method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: data.name }),
            }).then((r) => r.json()),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['taskFolders'] })
            onSuccessCallback()
            toast.success('이름이 수정되었습니다.')
        },
    })
}

export function useDeleteTaskFolderMutation(onSuccessCallback: () => void) {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: (id: number) => fetch(`/api/tasks/folders/${id}`, { method: 'DELETE' }).then((r) => r.json()),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['taskFolders'] })
            onSuccessCallback()
            toast.success('폴더가 삭제되었습니다.')
        },
    })
}
