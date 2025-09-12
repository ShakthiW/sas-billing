import { SignUp } from '@clerk/nextjs'

export default function SignUpPage() {
    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-50">
            <div className="w-full max-w-md">
                <SignUp
                    appearance={{
                        elements: {
                            formButtonPrimary:
                                "bg-blue-600 hover:bg-blue-700 text-white"
                        }
                    }}
                    redirectUrl="/dashboard"
                />
            </div>
        </div>
    )
}
