# AI Rules & Guidelines for AdminBarber

## Tech Stack Overview

- **React 18** with TypeScript as the core framework for building the user interface
- **Vite** as the build tool and development server for fast HMR and optimized builds
- **Tailwind CSS** with `tailwind-merge` and `clsx` for utility-first styling and responsive design
- **shadcn/ui** component library (Radix UI primitives) for consistent, accessible UI components
- **React Router v6** for client-side routing and navigation between pages
- **TanStack Query (React Query)** for server state management, caching, and data synchronization
- **Supabase** as the backend (PostgreSQL database, authentication, storage, and edge functions)
- **Zod** for runtime type validation and schema definitions
- **PWA support** via `vite-plugin-pwa` for offline capabilities and native app experience

## Library Usage Rules

### Component Libraries
- **Use shadcn/ui components** for all common UI elements (buttons, inputs, dialogs, cards, etc.)
- **Never modify shadcn/ui component files directly** — create wrapper components or new components if changes are needed
- **Import components from `@/components/ui/`** for all shadcn/ui components
- **Use Radix UI primitives** (from shadcn/ui) for complex interactive elements (dropdowns, modals, tooltips)

### State Management
- **Use TanStack Query** for all server state, API calls, and data fetching
- **Use React Context** only for global app state (Auth, Barbershop, Appointment contexts)
- **Avoid Redux or other external state libraries** — React Query + Context is sufficient
- **Keep local component state** with `useState` for UI-only state

### Styling & Layout
- **Use Tailwind CSS classes** for all styling — no custom CSS files except in `src/index.css` for globals
- **Use `cn()` utility** from `@/lib/utils` for conditional class names
- **Responsive design is mandatory** — all components must work on mobile (375px) and desktop (1440px+)
- **Use CSS variables** from `:root` in `index.css` for colors, spacing, and theming
- **Avoid inline styles** — use Tailwind classes or create styled components

### Data Fetching & API
- **Use Supabase client** from `@/integrations/supabase/client` for all database operations
- **Always filter queries by `barbershop_id`** when fetching data for multi-tenant isolation
- **Use React Query hooks** (`useQuery`, `useMutation`) for data operations
- **Implement optimistic updates** for mutations where appropriate
- **Handle loading and error states** in all data-fetching components

### Routing & Navigation
- **Use React Router** for all client-side navigation
- **Define routes in `src/App.tsx`** — do not create separate route files
- **Use `Link` and `NavLink`** components for navigation (never `<a>` tags for internal links)
- **Protect routes** with `ProtectedRoute` component for authenticated pages
- **Use `useNavigate`** for programmatic navigation

### Forms & Validation
- **Use React Hook Form** for complex forms (already installed)
- **Use Zod** for form schema validation
- **Use shadcn/ui form components** (`Form`, `FormField`, `FormItem`, etc.)
- **Implement proper error handling** and user feedback with toast notifications

### Notifications & Feedback
- **Use `sonner`** (via `@/components/ui/sonner`) for toast notifications
- **Use `useToast`** hook from `@/hooks/use-toast` for consistent toast API
- **Show loading states** for all async actions (button spinners, skeleton loaders)
- **Use skeleton components** for content loading states

### Icons & Assets
- **Use `lucide-react`** for all icons (already installed)
- **Import icons individually** — do not import entire icon sets
- **Use SVG icons** from `public/` for logos and static assets
- **Optimize images** for web (WebP format preferred)

### Code Organization
- **Use TypeScript** for all files — no `.js` files
- **Use `@/` alias** for imports from `src/` directory
- **Group related files** in feature-based folders (e.g., `src/components/booking/`, `src/pages/`)
- **Use PascalCase** for component files (e.g., `AppointmentCard.tsx`)
- **Use kebab-case** for non-component files (e.g., `use-mobile.tsx`, `utils.ts`)

### Performance & Best Practices
- **Code-split** with React.lazy() for heavy components
- **Memoize expensive computations** with `useMemo` and `useCallback`
- **Avoid unnecessary re-renders** with proper dependency arrays
- **Use `React.Suspense`** for async component loading
- **Implement proper error boundaries** for graceful error handling

### PWA & Offline
- **Service worker** is configured in `public/sw.js` — do not modify directly
- **Use Workbox** for caching strategies (configured in `vite.config.ts`)
- **Test offline functionality** regularly
- **Cache static assets** appropriately for offline use

### Security
- **Never expose Supabase service role key** in client-side code
- **Use Row Level Security (RLS)** policies in Supabase for data protection
- **Validate all user inputs** on the client and server (edge functions)
- **Use HTTPS** for all external API calls
- **Sanitize user-generated content** before rendering

### Testing
- **Write unit tests** for utility functions and hooks
- **Test critical user flows** (booking, checkout, authentication)
- **Use React Testing Library** for component tests (if tests are added)
- **Test on multiple devices** and screen sizes

### Deployment
- **Build with `npm run build`** before deploying
- **Test production build** locally with `npm run preview`
- **Environment variables** must be configured in deployment platform
- **PWA manifest** is auto-generated — verify before production

---

**When in doubt, follow existing patterns in the codebase.** Consistency is more important than cleverness.