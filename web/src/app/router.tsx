import { createBrowserRouter, Navigate } from 'react-router'
import { AuthScreen } from '@/features/auth/AuthScreen'
import { CameraScreen } from '@/features/camera/CameraScreen'
import { ChatsScreen } from '@/features/chats/ChatsScreen'
import { DiscoverScreen } from '@/features/discover/DiscoverScreen'
import { TagScreen } from '@/features/discover/TagScreen'
import { OnboardingFlow } from '@/features/onboarding/OnboardingFlow'
import { ProfileScreen } from '@/features/profile/ProfileScreen'
import { PublicProfileScreen } from '@/features/profile/PublicProfileScreen'
import { SettingsScreen } from '@/features/settings/SettingsScreen'
import { StoriesScreen } from '@/features/stories/StoriesScreen'
import { AppShell } from './AppShell'
import { RedirectIfAuthed, RequireAuth, RequireOnboarded } from './guards'

export const router = createBrowserRouter([
  { element: <RedirectIfAuthed />, children: [{ path: '/auth', element: <AuthScreen /> }] },
  {
    element: <RequireAuth />,
    children: [
      { path: '/onboarding', element: <OnboardingFlow /> },
      {
        element: <RequireOnboarded />,
        children: [
          {
            element: <AppShell />,
            children: [
              { index: true, element: <Navigate to="/camera" replace /> },
              { path: '/camera', element: <CameraScreen /> },
              { path: '/chats', element: <ChatsScreen /> },
              { path: '/discover', element: <DiscoverScreen /> },
              { path: '/discover/tag/:slug', element: <TagScreen /> },
              { path: '/stories', element: <StoriesScreen /> },
              { path: '/profile', element: <ProfileScreen /> },
              { path: '/u/:username', element: <PublicProfileScreen /> },
              { path: '/settings', element: <SettingsScreen /> },
            ],
          },
        ],
      },
    ],
  },
  { path: '*', element: <Navigate to="/camera" replace /> },
])
