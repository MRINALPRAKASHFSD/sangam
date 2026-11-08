import { Camera } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useMe, useUserId } from '@/app/auth'
import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Field, Input, Textarea } from '@/components/ui/input'
import { Sheet } from '@/components/ui/sheet'
import { Switch } from '@/components/ui/switch'
import { useToast } from '@/components/ui/toast'
import { encodeCanvas, imageFileToCanvas } from '@/lib/media'
import { supabase } from '@/lib/supabase'
import { errorMessage } from '@/lib/utils'
import { useUpdateProfile } from './api'

export function ProfileEditSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { data: me } = useMe()
  const uid = useUserId()
  const update = useUpdateProfile()
  const toast = useToast()
  const [name, setName] = useState('')
  const [bio, setBio] = useState('')
  const [uploading, setUploading] = useState(false)
  const p = me?.profile
  const isMinor = p?.age_band === 'minor'

  useEffect(() => { if (open && p) { setName(p.display_name ?? ''); setBio(p.bio ?? '') } }, [open, p])

  async function onAvatar(file: File) {
    setUploading(true)
    try {
      const canvas = await imageFileToCanvas(file, 512)
      const { blob } = await encodeCanvas(canvas, { maxEdge: 512, quality: 0.85 })
      const path = `${uid}/avatar-${Date.now()}.${blob.type === 'image/webp' ? 'webp' : 'jpg'}`
      const { error } = await supabase.storage.from('avatars').upload(path, blob, { contentType: blob.type })
      if (error) throw error
      const old = p?.avatar_path
      await update.mutateAsync({ avatar_path: path })
      if (old) await supabase.storage.from('avatars').remove([old])
      toast('Profile photo updated', 'success')
    } catch (e) {
      toast(errorMessage(e), 'error')
    } finally {
      setUploading(false)
    }
  }

  async function save() {
    try {
      await update.mutateAsync({ display_name: name.trim(), bio: bio.trim() || null })
      toast('Profile saved', 'success')
      onOpenChange(false)
    } catch (e) {
      toast(errorMessage(e), 'error')
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange} title="Edit profile">
      <div className="space-y-5">
        <div className="flex items-center gap-4">
          <Avatar path={p?.avatar_path} name={p?.display_name} size="lg" ring />
          <Button variant="glass" size="sm" asChild>
            <label className="cursor-pointer">
              <Camera className="size-4" /> {uploading ? 'Uploading…' : 'Change photo'}
              <input type="file" accept="image/*" className="sr-only" disabled={uploading} onChange={(e) => { const f = e.target.files?.[0]; if (f) onAvatar(f); e.target.value = '' }} />
            </label>
          </Button>
        </div>
        <Field label="Display name"><Input value={name} maxLength={40} onChange={(e) => setName(e.target.value)} /></Field>
        <Field label="Bio" hint={`${bio.length}/160`}><Textarea value={bio} maxLength={160} onChange={(e) => setBio(e.target.value)} placeholder="Say something about yourself…" /></Field>
        <div className="glass flex items-center gap-3 rounded-2xl p-4">
          <div className="flex-1">
            <p className="font-semibold">Private account</p>
            <p className="text-sm text-muted">{isMinor ? 'Always on for users under 18.' : 'Hides your bio and interests from people who are not your friends.'}</p>
          </div>
          <Switch checked={!!p?.is_private} disabled={isMinor} onChange={(v) => update.mutate({ is_private: v })} label="Private account" />
        </div>
        <Button className="w-full" size="lg" onClick={save} loading={update.isPending} disabled={!name.trim()}>Save</Button>
      </div>
    </Sheet>
  )
}
