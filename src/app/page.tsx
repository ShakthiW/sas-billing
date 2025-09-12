'use client'
import {
  SignedIn,
  SignedOut,
  UserButton,
  useUser,
  SignInButton
} from '@clerk/nextjs';

export default function AuthTestPage() {
  const { user } = useUser();

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-900 to-blue-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-8">
        <SignedIn>
          <div className="flex flex-col items-center space-y-6">
            <div className="w-20 h-20 relative">
              <UserButton
                appearance={{
                  elements: {
                    avatarBox: "w-full h-full border-4 border-blue-100",
                  }
                }}
              />
            </div>

            <div className="text-center space-y-2">
              <h1 className="text-2xl font-bold text-gray-800">
                Welcome back{user?.firstName ? `, ${user.firstName}` : ''}! 👋
              </h1>
              <p className="text-gray-600">
                {user?.primaryEmailAddress?.emailAddress}
              </p>
            </div>

            <div className="w-full pt-4">
              <a
                href="/dashboard"
                className="w-full px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors transform hover:scale-105 flex items-center justify-center space-x-2"
              >
                <span>Continue to Dashboard</span>
                <span>→</span>
              </a>
            </div>
          </div>
        </SignedIn>

        <SignedOut>
          <div className="flex flex-col items-center space-y-6">
            <div className="text-center space-y-4">
              <div className="text-6xl">🔒</div>
              <h1 className="text-3xl font-bold text-gray-800">
                Authentication Required
              </h1>
              <p className="text-gray-600">
                Please sign in to continue
              </p>
            </div>

            <SignInButton mode="redirect">
              <button className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors transform hover:scale-105">
                Sign In Now
              </button>
            </SignInButton>
          </div>
        </SignedOut>
      </div>
    </main>
  );
}
