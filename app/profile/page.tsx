'use client'

import { useEffect, useState } from 'react'
import { useDispatch } from 'react-redux'
import { useAuth } from '@/hooks/useAuth'
import { usersActions } from '@/store/slices/usersSlice'
import { DashboardLayout } from '@/components/layout'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { PageHeader } from '@/components/common'
import { toast } from 'sonner'
import { Shield, User as UserIcon, Key, Activity, Clock, Pencil, X, Eye, EyeOff } from 'lucide-react'
import { format } from 'date-fns'

export default function ProfilePage() {
  const { user, updateUser } = useAuth()
  const [dbUser, setDbUser] = useState<any>(null)
  
  // Edit State
  const [isEditingMode, setIsEditingMode] = useState(false)
  const [name, setName] = useState('')
  const [avatar, setAvatar] = useState('')
  const [nameError, setNameError] = useState('')
  const [savingProfile, setSavingProfile] = useState(false)
  
  // Password State
  const [newPassword, setNewPassword] = useState('')
  const [savingPassword, setSavingPassword] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  // Audit Logs State
  const [auditLogs, setAuditLogs] = useState<any[]>([])
  const dispatch = useDispatch()

  useEffect(() => {
    if (!user?.id) return

    dispatch(usersActions.fetchUserByIdRequest({
      id: user.id,
      resolve: (matched: any) => {
        if (matched) {
          setDbUser(matched)
          setName(matched.name ?? user.name)
          setAvatar(matched.avatar ?? user.avatar ?? '')

          dispatch(usersActions.fetchUserAuditRequest({
            userId: matched.id,
            limit: 5,
            resolve: (logs) => setAuditLogs(logs ?? [])
          }))

          if (matched.name !== user.name) {
            updateUser({ name: matched.name })
          }
        }
      }
    }))
  }, [user?.id, user?.name, updateUser, dispatch])

  function onSaveProfile(e: React.FormEvent) {
    e.preventDefault()
    if (!dbUser) return

    if (name.trim().length < 2) {
      setNameError('Name must be at least 2 characters long')
      return
    }
    setNameError('')

    setSavingProfile(true)
    dispatch(usersActions.updateUserRequest({
      id: dbUser.id,
      payload: { name: name.trim(), avatar: avatar.trim(), actorUserId: dbUser.id },
      resolve: () => {
        setSavingProfile(false)
        setDbUser({ ...dbUser, name: name.trim(), avatar: avatar.trim() })
        updateUser({ name: name.trim(), avatar: avatar.trim() })
        setIsEditingMode(false)
        toast.success('Profile updated')
      },
      reject: () => {
        setSavingProfile(false)
        toast.error('Failed to update profile')
      }
    }))
  }

  function onSavePassword(e: React.FormEvent) {
    e.preventDefault()
    if (!dbUser || !newPassword) return
    if (newPassword.length < 12) {
      toast.error('Password must be at least 12 characters and include uppercase, lowercase, number, and special character')
      return
    }

    setSavingPassword(true)
    dispatch(usersActions.updateUserPasswordRequest({
      id: dbUser.id,
      payload: { newPassword, actorUserId: dbUser.id },
      resolve: () => {
        setSavingPassword(false)
        toast.success('Password updated successfully')
        setNewPassword('')
      },
      reject: (err: string) => {
        setSavingPassword(false)
        toast.error(err || 'Failed to update password')
      }
    }))
  }

  const u = dbUser || user
  if (!u) return <DashboardLayout><div>Loading...</div></DashboardLayout>

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <PageHeader 
          title="Account Settings" 
          description="Manage your profile, security preferences, and view your recent activity."
        />

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="overview"><UserIcon className="w-4 h-4 mr-2"/> Overview</TabsTrigger>
            <TabsTrigger value="security"><Shield className="w-4 h-4 mr-2"/> Security</TabsTrigger>
          </TabsList>

          {/* OVERVIEW TAB */}
          <TabsContent value="overview" className="space-y-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div>
                  <CardTitle>Personal Information</CardTitle>
                  <CardDescription>View and manage your basic profile details.</CardDescription>
                </div>
                {!isEditingMode ? (
                  <Button variant="outline" size="sm" onClick={() => setIsEditingMode(true)}>
                    <Pencil className="mr-2 h-4 w-4" /> Edit
                  </Button>
                ) : (
                  <Button variant="ghost" size="sm" onClick={() => {
                    setIsEditingMode(false)
                    setName(u.name) // Reset name
                    setAvatar(u.avatar || '') // Reset avatar
                    setNameError('')
                  }}>
                    <X className="mr-2 h-4 w-4" /> Cancel
                  </Button>
                )}
              </CardHeader>
              <form onSubmit={onSaveProfile}>
                <CardContent className="space-y-6">
                  <div className="flex items-center gap-4">
                    <Avatar className="h-20 w-20">
                      <AvatarImage src={u.avatar || ''} />
                      <AvatarFallback className="text-2xl">{u.name?.substring(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="font-medium text-lg">{u.name}</h3>
                      <p className="text-sm text-muted-foreground capitalize">{u.role?.name || u.roleSlug || 'Super Admin'}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Full Name</Label>
                      {isEditingMode ? (
                        <>
                          <Input 
                            value={name} 
                            onChange={(e) => {
                              setName(e.target.value)
                              if (e.target.value.trim().length >= 2) setNameError('')
                            }} 
                            className={nameError ? "border-destructive" : ""}
                          />
                          {nameError && <p className="text-xs text-destructive">{nameError}</p>}
                        </>
                      ) : (
                        <p className="text-sm border rounded-md p-2 bg-muted/50">{u.name}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label>Email Address</Label>
                      <p className="text-sm border rounded-md p-2 bg-muted/50 text-muted-foreground">{u.email}</p>
                      {isEditingMode && <p className="text-xs text-muted-foreground">Email addresses cannot be changed directly.</p>}
                    </div>
                  </div>
                  
                  {isEditingMode && (
                    <div className="space-y-2">
                      <Label>Avatar Image</Label>
                      <Input 
                        type="file" 
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (file) {
                            if (file.size > 2 * 1024 * 1024) {
                              toast.error('Image must be less than 2MB')
                              return
                            }
                            const reader = new FileReader()
                            reader.onloadend = () => {
                              setAvatar(reader.result as string)
                            }
                            reader.readAsDataURL(file)
                          }
                        }} 
                      />
                      <p className="text-xs text-muted-foreground">Upload a profile picture (max 2MB).</p>
                      {avatar && avatar !== u.avatar && (
                        <div className="mt-2 text-xs text-green-600 font-medium">Image ready to save</div>
                      )}
                    </div>
                  )}
                  
                  {isEditingMode && (
                    <Button type="submit" disabled={savingProfile}>
                      {savingProfile ? 'Saving...' : 'Save Changes'}
                    </Button>
                  )}
                </CardContent>
              </form>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Activity className="w-5 h-5"/> Your Recent Activity</CardTitle>
                <CardDescription>A log of the administrative actions you have taken recently.</CardDescription>
              </CardHeader>
              <CardContent>
                {auditLogs.length > 0 ? (
                  <div className="space-y-4">
                    {auditLogs.map((log) => (
                      <div key={log.id} className="flex items-start gap-4 pb-4 border-b last:border-0 last:pb-0">
                        <div className="bg-primary/10 p-2 rounded-full">
                          <Activity className="h-4 w-4 text-primary" />
                        </div>
                        <div className="flex-1 space-y-1">
                          <p className="text-sm font-medium">
                            <span className="capitalize">{log.action}</span> action on {log.entityType}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Entity ID: {log.entityId}
                          </p>
                        </div>
                        <div className="flex items-center text-xs text-muted-foreground">
                          <Clock className="mr-1 h-3 w-3" />
                          {format(new Date(log.createdAt), 'MMM d, h:mm a')}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">No recent activity found.</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* SECURITY TAB */}
          <TabsContent value="security" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Key className="w-5 h-5"/> Change Password</CardTitle>
                <CardDescription>Update your password to keep your account secure.</CardDescription>
              </CardHeader>
              <form onSubmit={onSavePassword}>
                <CardContent className="space-y-4 max-w-md">
                  <div className="space-y-2">
                    <Label>New Password</Label>
                    <div className="relative">
                      <Input 
                        type={showPassword ? "text" : "password"} 
                        value={newPassword} 
                        onChange={(e) => setNewPassword(e.target.value)} 
                        required 
                        placeholder="12+ chars, Aa, 0-9, special"
                        className="pr-10"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent text-muted-foreground"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                  <Button type="submit" disabled={savingPassword}>
                    {savingPassword ? 'Updating...' : 'Update Password'}
                  </Button>
                </CardContent>
              </form>
            </Card>
          </TabsContent>

        </Tabs>
      </div>
    </DashboardLayout>
  )
}
