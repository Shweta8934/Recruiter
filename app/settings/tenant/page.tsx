'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useDispatch } from 'react-redux'
import { organizationActions } from '@/store/slices/organizationSlice'
import { DashboardLayout } from '@/components/layout'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/useAuth'

export default function TenantSettingsPage() {
  const { user } = useAuth()
  const router = useRouter()
  const dispatch = useDispatch()
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)
  const [logoUploadLoading, setLogoUploadLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    industry: '',
    primaryColor: '#000000',
    logo: '',
    proctorSnapshotIntervalSec: 30,
    flagThreshold: 3,
    aiEnabled: true,
  })

  useEffect(() => {
    async function loadTenantData() {
      if (!user?.organizationId) return;
      try {
        setFetching(true)
        await new Promise<void>((resolve, reject) => {
          dispatch(organizationActions.loadOrganizationByIdRequest({
            organizationId: user.organizationId,
            resolve: (data: any) => {
              if (data?.organization) {
                const org = data.organization
                setFormData({
                  name: org.name || '',
                  industry: org.industry || '',
                  primaryColor: org.primaryColor || '#000000',
                  logo: org.logo || '',
                  proctorSnapshotIntervalSec: org.settings?.assessment?.proctorSnapshotIntervalSec ?? 30,
                  flagThreshold: org.settings?.assessment?.flagThreshold ?? 3,
                  aiEnabled: org.settings?.screening?.aiEnabled ?? true,
                })
              }
              resolve()
            },
            reject
          }))
        })
      } catch (err) {
        toast.error('Failed to load tenant settings')
      } finally {
        setFetching(false)
      }
    }
    loadTenantData()
  }, [user, dispatch])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user?.organizationId) return

    setLoading(true)
    try {
      const payload = {
        name: formData.name,
        industry: formData.industry,
        primaryColor: formData.primaryColor,
        logo: formData.logo,
        settings: {
          assessment: {
            proctorSnapshotIntervalSec: Number(formData.proctorSnapshotIntervalSec),
            flagThreshold: Number(formData.flagThreshold),
          },
          screening: {
            aiEnabled: formData.aiEnabled,
            defaultMode: formData.aiEnabled ? 'ai-assisted' : 'manual'
          }
        }
      }

      await new Promise<void>((resolve, reject) => {
        dispatch(organizationActions.updateOrganizationRequest({
          organizationId: user.organizationId,
          payload,
          resolve,
          reject
        }))
      })
      
      toast.success('Tenant settings updated successfully!')
      router.refresh()
    } catch (err: any) {
      toast.error(err || 'Failed to update settings')
    } finally {
      setLoading(false)
    }
  }

  if (fetching) {
    return (
      <DashboardLayout>
        <div className="p-6">Loading tenant settings...</div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 p-6 max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold tracking-tight">Tenant Settings</h1>
        <p className="text-muted-foreground">Manage your organization's branding and application settings.</p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Branding & Identity</CardTitle>
              <CardDescription>Configure how your organization appears to candidates.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Organization Name</Label>
                <Input id="name" name="name" value={formData.name} onChange={handleChange} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="industry">Industry</Label>
                <Input id="industry" name="industry" value={formData.industry} onChange={handleChange} />
              </div>
              <div className="space-y-2 pt-2 pb-4">
                <Label>Organization Logo</Label>
                <div className="flex flex-col sm:flex-row gap-8 items-start mt-2">
                  
                  {/* Inputs Section */}
                  <div className="flex-1 space-y-4 w-full">
                    
                    {/* URL Input */}
                    {!formData.logo.startsWith('/uploads/') && (
                      <div className="space-y-2">
                        <Label htmlFor="logo" className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Image URL</Label>
                        <Input 
                          id="logo" 
                          name="logo" 
                          type="text" 
                          value={formData.logo} 
                          onChange={handleChange} 
                          placeholder="Paste image URL here..." 
                          className="bg-white"
                        />
                      </div>
                    )}

                    {/* OR Divider */}
                    {!formData.logo && !logoUploadLoading && (
                      <div className="flex items-center gap-4 py-1">
                        <div className="h-px bg-slate-200 flex-1"></div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Or</span>
                        <div className="h-px bg-slate-200 flex-1"></div>
                      </div>
                    )}

                    {/* File Upload */}
                    {(!formData.logo || formData.logo.startsWith('/uploads/')) && (
                      <div className="space-y-2">
                        <Label className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Upload File</Label>
                        <div className="flex flex-col gap-2">
                          <Input 
                            type="file" 
                            accept="image/*"
                            disabled={logoUploadLoading}
                            className="bg-white text-sm file:mr-4 file:py-1.5 file:px-4 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 cursor-pointer"
                            onChange={(e) => {
                              const file = e.target.files?.[0]
                              if (!file) {
                                 if (formData.logo.startsWith('/uploads/')) setFormData(prev => ({ ...prev, logo: '' }))
                                 return;
                              }
                              
                              setLogoUploadLoading(true)
                              const data = new FormData()
                              data.append('file', file)
                              data.append('folder', 'logos')
                              dispatch(organizationActions.uploadFileRequest({
                                payload: data,
                                resolve: (json: any) => {
                                  if (json.url) {
                                    setFormData(prev => ({ ...prev, logo: json.url }))
                                  } else {
                                    toast.error('Failed to upload image')
                                  }
                                  setLogoUploadLoading(false)
                                },
                                reject: () => {
                                  toast.error('Error uploading image')
                                  setLogoUploadLoading(false)
                                }
                              }))
                            }}
                          />
                          {logoUploadLoading && <p className="text-xs text-primary animate-pulse font-medium">Uploading...</p>}
                          {formData.logo.startsWith('/uploads/') && (
                             <Button type="button" variant="ghost" size="sm" className="w-fit h-8 text-xs text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => {
                                 setFormData(prev => ({ ...prev, logo: '' }))
                             }}>
                               Remove Uploaded File
                             </Button>
                          )}
                        </div>
                      </div>
                    )}

                  </div>
                  
                  {/* Logo Preview */}
                  <div className="w-32 h-32 border rounded-xl bg-slate-50 flex flex-col items-center justify-center overflow-hidden shrink-0 shadow-inner p-3 relative group">
                    {formData.logo ? (
                      <img src={formData.logo} alt="Logo Preview" className="max-w-full max-h-full object-contain" />
                    ) : (
                      <div className="text-center">
                        <div className="w-8 h-8 bg-slate-200 rounded-full mx-auto mb-2"></div>
                        <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">No Preview</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="primaryColor">Primary Brand Color</Label>
                <div className="flex items-center gap-4">
                  <Input 
                    id="primaryColor" 
                    name="primaryColor" 
                    type="color" 
                    value={formData.primaryColor} 
                    onChange={handleChange} 
                    className="w-16 h-10 p-1"
                  />
                  <span className="text-sm text-muted-foreground uppercase">{formData.primaryColor}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Assessment & AI Settings</CardTitle>
              <CardDescription>Configure proctoring and AI screening behaviors.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="proctorSnapshotIntervalSec">Proctoring Snapshot Interval (seconds)</Label>
                <Input 
                  id="proctorSnapshotIntervalSec" 
                  name="proctorSnapshotIntervalSec" 
                  type="number" 
                  min="10" 
                  max="300"
                  value={formData.proctorSnapshotIntervalSec} 
                  onChange={handleChange} 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="flagThreshold">Proctoring Flag Threshold</Label>
                <Input 
                  id="flagThreshold" 
                  name="flagThreshold" 
                  type="number" 
                  min="1"
                  max="10"
                  value={formData.flagThreshold} 
                  onChange={handleChange} 
                />
              </div>
              <div className="flex items-center gap-2 mt-4">
                <input 
                  type="checkbox" 
                  id="aiEnabled" 
                  name="aiEnabled" 
                  checked={formData.aiEnabled} 
                  onChange={handleChange} 
                  className="w-4 h-4 rounded border-gray-300"
                />
                <Label htmlFor="aiEnabled">Enable AI Resume Screening</Label>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : 'Save Settings'}
            </Button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  )
}
