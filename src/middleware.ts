import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { apiRateLimiter, authRateLimiter, uploadRateLimiter } from "./middleware/rateLimiter";

const isPublicRoute = createRouteMatcher([
    "/sign-in(.*)",
    "/sign-up(.*)",
    "/",
    "/api/webhooks(.*)",
]);

export default clerkMiddleware(async (auth, request: NextRequest) => {
    // Apply rate limiting for API routes
    if (request.nextUrl.pathname.startsWith("/api/")) {
        // Special rate limiting for auth endpoints
        if (request.nextUrl.pathname.includes("/auth") || 
            request.nextUrl.pathname.includes("/sign")) {
            const rateLimitResponse = await authRateLimiter(request);
            if (rateLimitResponse) return rateLimitResponse;
        }
        // Special rate limiting for upload endpoints
        else if (request.nextUrl.pathname.includes("/upload") || 
                 request.nextUrl.pathname.includes("/image")) {
            const rateLimitResponse = await uploadRateLimiter(request);
            if (rateLimitResponse) return rateLimitResponse;
        }
        // General API rate limiting
        else {
            const rateLimitResponse = await apiRateLimiter(request);
            if (rateLimitResponse) return rateLimitResponse;
        }

        // Add security headers for API routes
        const response = NextResponse.next();
        response.headers.set('X-Content-Type-Options', 'nosniff');
        response.headers.set('X-Frame-Options', 'DENY');
        response.headers.set('X-XSS-Protection', '1; mode=block');
        response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
        
        return response;
    }

    // Protect routes that aren't public
    if (!isPublicRoute(request)) {
        await auth.protect();
    }

    return NextResponse.next();
});

export const config = {
    matcher: [
        // Skip Next.js internals and all static files, unless found in search params
        '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
        // Always run for API routes
        '/(api|trpc)(.*)',
    ],
};