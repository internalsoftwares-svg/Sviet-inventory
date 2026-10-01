'use client'

import { useMemo, useState } from 'react'
import { useInfiniteQuery, keepPreviousData } from '@tanstack/react-query'
import { api } from '@/lib/api/client'
import { Loader2, Search, Key, Eye, EyeOff } from 'lucide-react'
import { useDebouncedValue } from '@/lib/hooks/use-debounced-value'
import toast from 'react-hot-toast'

interface UserRecord {
  id: string
  name: string
  email: string
  role: string
  department: string | null
  isActive: boolean
  isApproved: boolean
  requestCount: number
  createdAt: string
}

const PAGE_SIZE = 50

export default function SuperAdminUsersPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const debouncedSearch = useDebouncedValue(searchTerm, 300)
  
  // Password Reset Modal State
  const [resetModalUser, setResetModalUser] = useState<{ id: string; name: string } | null>(null)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isResetting, setIsResetting] = useState(false)

  const usersQuery = useInfiniteQuery({
    queryKey: ['super-admin-users', debouncedSearch],
    initialPageParam: undefined as string | undefined,
    queryFn: async ({ pageParam }) => {
      const res = await api.get('/super-admin/users', { params: { cursor: pageParam, limit: PAGE_SIZE, search: debouncedSearch || undefined } })
      return res.data as { data: UserRecord[]; meta?: { nextCursor?: string | null } }
    },
    getNextPageParam: (lastPage) => lastPage.meta?.nextCursor ?? undefined,
    placeholderData: keepPreviousData,
  })

  const users = useMemo(
    () => usersQuery.data?.pages.flatMap((p) => p.data) ?? [],
    [usersQuery.data]
  )

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!resetModalUser || !newPassword || !confirmPassword) return

    if (newPassword.length < 8) {
      toast.error('Password must be at least 8 characters')
      return
    }

    if (newPassword.includes(' ')) {
      toast.error('Password cannot contain spaces')
      return
    }

    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match')
      return
    }

    setIsResetting(true)
    try {
      await api.post(`/super-admin/users/${resetModalUser.id}/reset-password`, {
        password: newPassword
      })
      toast.success(`Password reset successfully for ${resetModalUser.name}`)
      setResetModalUser(null)
      setNewPassword('')
      setConfirmPassword('')
      setShowPassword(false)
      setShowConfirmPassword(false)
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Failed to reset password')
    } finally {
      setIsResetting(false)
    }
  }

  if (usersQuery.isLoading) {
    return (
      <div className="p-12 flex justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-black" />
      </div>
    )
  }

  return (
    <div className="space-y-6 page-enter">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-display font-bold text-[--ink-primary]">User Management</h1>
          <p className="text-sm text-[--ink-secondary]">View all registered users and administrators across the platform.</p>
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-white border border-[--border-default] rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-all"
          />
        </div>
      </div>

      {usersQuery.isError && (
        <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-4 flex items-center justify-between">
          <span className="text-sm">Couldn&apos;t load users.</span>
          <button onClick={() => usersQuery.refetch()} disabled={usersQuery.isFetching} className="text-sm font-medium underline disabled:opacity-50 disabled:cursor-not-allowed">{usersQuery.isFetching ? 'Retrying…' : 'Retry'}</button>
        </div>
      )}

      <div className="bg-white rounded-xl border border-[--border-default] overflow-hidden shadow-sm">
        {users.length === 0 ? (
          <div className="p-12 text-center text-[--ink-secondary]">No users found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-[--bg-subtle] border-b border-[--border-default] text-[--ink-secondary]">
                <tr>
                  <th className="px-6 py-4 font-medium">Name</th>
                  <th className="px-6 py-4 font-medium">Role</th>
                  <th className="px-6 py-4 font-medium">Department</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                  <th className="px-6 py-4 font-medium text-right">Requests</th>
                  <th className="px-6 py-4 font-medium text-right">Joined</th>
                  <th className="px-6 py-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[--border-default]">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-[--bg-canvas] transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-medium text-[--ink-primary]">{user.name}</span>
                        <span className="text-xs text-[--ink-secondary]">{user.email}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${
                        user.role === 'SUPER_ADMIN' ? 'bg-purple-100 text-purple-800 border-purple-200' :
                        user.role === 'ADMIN' ? 'bg-blue-100 text-blue-800 border-blue-200' :
                        'bg-gray-100 text-gray-800 border-gray-200'
                      }`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-[--ink-secondary]">{user.department || '-'}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${
                        !user.isApproved ? 'bg-yellow-100 text-yellow-800 border-yellow-200' :
                        !user.isActive ? 'bg-red-100 text-red-800 border-red-200' :
                        'bg-green-100 text-green-800 border-green-200'
                      }`}>
                        {!user.isApproved ? 'Pending' : !user.isActive ? 'Inactive' : 'Active'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-[--ink-primary] font-medium text-right">
                      {user.requestCount}
                    </td>
                    <td className="px-6 py-4 text-[--ink-secondary] text-right">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => setResetModalUser({ id: user.id, name: user.name })}
                        className="inline-flex items-center text-xs font-medium text-gray-600 hover:text-black border border-gray-200 hover:bg-gray-50 rounded-md px-3 py-1.5 transition-colors"
                      >
                        <Key className="w-3.5 h-3.5 mr-1.5" />
                        Reset Password
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {users.length > 0 && (
        <div className="flex items-center justify-between text-sm text-[--ink-secondary]">
          <span>Showing {users.length} users</span>
          {usersQuery.hasNextPage && (
            <button
              onClick={() => usersQuery.fetchNextPage()}
              disabled={usersQuery.isFetchingNextPage}
              className="px-4 py-2 border border-[--border-default] hover:bg-black hover:text-white transition duration-75 rounded-md font-medium disabled:opacity-50"
            >
              {usersQuery.isFetchingNextPage ? 'Loading...' : 'Load more'}
            </button>
          )}
        </div>
      )}

      {/* Password Reset Modal */}
      {resetModalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 animate-in fade-in zoom-in-95">
            <h2 className="text-xl font-bold text-gray-900 mb-2">Reset Password</h2>
            <p className="text-sm text-gray-500 mb-6">
              Enter a new password for <span className="font-semibold text-gray-900">{resetModalUser.name}</span>.
            </p>

            <form onSubmit={handleResetPassword}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full pl-3 pr-10 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-black"
                      placeholder="Minimum 8 characters, no spaces"
                      required
                      minLength={8}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 focus:outline-none"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {newPassword.length > 0 && newPassword.length < 8 && (
                    <p className="text-sm text-red-500 mt-1">Password must be at least 8 characters</p>
                  )}
                  {newPassword.includes(' ') && (
                    <p className="text-sm text-red-500 mt-1">Password cannot contain spaces</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full pl-3 pr-10 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-black"
                      placeholder="Re-enter new password"
                      required
                      minLength={8}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 focus:outline-none"
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {confirmPassword && newPassword !== confirmPassword && (
                    <p className="text-sm text-red-500 mt-1">Passwords do not match</p>
                  )}
                </div>
              </div>

              <div className="mt-8 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setResetModalUser(null)
                    setNewPassword('')
                    setConfirmPassword('')
                    setShowPassword(false)
                    setShowConfirmPassword(false)
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black"
                  disabled={isResetting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={
                    isResetting || 
                    !newPassword || 
                    !confirmPassword || 
                    newPassword !== confirmPassword || 
                    newPassword.length < 8 || 
                    newPassword.includes(' ')
                  }
                  className="inline-flex justify-center px-4 py-2 text-sm font-medium text-white bg-black border border-transparent rounded-md hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black disabled:opacity-50"
                >
                  {isResetting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Resetting...
                    </>
                  ) : (
                    'Confirm Reset'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}


