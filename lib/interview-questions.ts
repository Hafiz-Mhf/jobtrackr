import type { InterviewQuestion } from '@/types'

export const universalQuestions: InterviewQuestion[] = [
  { question: 'Tell me about a project you are most proud of.', category: 'behavioral', tip: 'Use STAR format. Pick something with a real challenge and measurable outcome.' },
  { question: 'How do you handle disagreements with teammates on technical decisions?', category: 'behavioral', tip: 'Show you can advocate for your view while staying collaborative.' },
  { question: 'Describe a time you had to learn something new quickly.', category: 'behavioral', tip: 'Emphasize your learning process, not just the outcome.' },
  { question: 'Why do you want to work here?', category: 'company', tip: 'Reference something specific from their product or engineering blog, not generic praise.' },
  { question: 'What are you looking for in your next role?', category: 'rolefit', tip: 'Tie your answer to concrete growth areas, not just compensation.' },
  { question: 'How do you prioritize when everything feels urgent?', category: 'behavioral', tip: 'Mention a specific framework or heuristic you use, with an example.' },
]

export const questionBank: Record<string, InterviewQuestion[]> = {
  'React': [
    { question: 'Explain the difference between useMemo and useCallback.', category: 'technical', tip: 'Focus on what each memoizes — values vs functions — and when overuse hurts performance.' },
    { question: 'How does React\'s reconciliation algorithm decide what to re-render?', category: 'technical', tip: 'Mention keys, the virtual DOM diff, and how state updates trigger re-renders.' },
    { question: 'When would you reach for useReducer instead of useState?', category: 'technical', tip: 'Talk about complex state transitions with multiple sub-values or actions.' },
  ],
  'Next.js': [
    { question: 'What is the difference between a Server Component and a Client Component?', category: 'technical', tip: 'Cover data fetching location, bundle size, and interactivity.' },
    { question: 'How does the App Router handle caching and revalidation?', category: 'technical', tip: 'Mention fetch caching, cacheTag/cacheLife, and route segment config.' },
    { question: 'When would you use a Server Action vs an API route?', category: 'technical', tip: 'Server Actions for form mutations tied to a component, API routes for external consumers.' },
  ],
  'Vue': [
    { question: 'Explain reactivity in Vue 3\'s Composition API.', category: 'technical', tip: 'Mention refs vs reactive objects and when each is appropriate.' },
    { question: 'How do you share logic between components in Vue 3?', category: 'technical', tip: 'Talk about composables and their naming convention.' },
  ],
  'Angular': [
    { question: 'What is the difference between a Component and a Directive in Angular?', category: 'technical', tip: 'Explain structural vs attribute directives with an example.' },
    { question: 'How does Angular\'s dependency injection system work?', category: 'technical', tip: 'Mention providers, injectors, and hierarchical injection.' },
  ],
  'TypeScript': [
    { question: 'What is the difference between an interface and a type alias?', category: 'technical', tip: 'Mention declaration merging and union/intersection support as differentiators.' },
    { question: 'How do generics improve type safety in reusable functions?', category: 'technical', tip: 'Give a concrete example like a generic fetch wrapper.' },
    { question: 'Explain discriminated unions and when you\'d use them.', category: 'technical', tip: 'Use a status/result type example to show narrowing in practice.' },
  ],
  'JavaScript': [
    { question: 'Explain closures with a practical example.', category: 'technical', tip: 'Show a counter or memoization example, not just the definition.' },
    { question: 'What is the event loop and how does it handle async code?', category: 'technical', tip: 'Cover call stack, microtasks vs macrotasks, and promise resolution order.' },
    { question: 'What is the difference between == and ===?', category: 'technical', tip: 'Mention type coercion rules briefly, then explain why === is the safer default.' },
  ],
  'Node.js': [
    { question: 'How does Node.js handle concurrency with a single thread?', category: 'technical', tip: 'Explain the event loop, libuv, and non-blocking I/O.' },
    { question: 'How would you handle a memory leak in a long-running Node process?', category: 'technical', tip: 'Mention heap snapshots, common leak sources like unbounded caches or listeners.' },
  ],
  'Express': [
    { question: 'How does middleware ordering affect request handling in Express?', category: 'technical', tip: 'Explain the request pipeline and next() flow with an example.' },
    { question: 'How would you structure error handling across an Express API?', category: 'technical', tip: 'Mention centralized error-handling middleware and async wrapper patterns.' },
  ],
  'Python': [
    { question: 'Explain the difference between a list and a generator.', category: 'technical', tip: 'Focus on memory usage and lazy evaluation.' },
    { question: 'How does Python\'s GIL affect multi-threaded programs?', category: 'technical', tip: 'Mention when multiprocessing is preferred over threading for CPU-bound work.' },
  ],
  'Django': [
    { question: 'How does Django\'s ORM handle N+1 query problems?', category: 'technical', tip: 'Mention select_related and prefetch_related with an example.' },
    { question: 'Explain Django\'s request/response middleware chain.', category: 'technical', tip: 'Walk through the order middleware executes on request vs response.' },
  ],
  'FastAPI': [
    { question: 'How does FastAPI use type hints for request validation?', category: 'technical', tip: 'Mention Pydantic models and automatic OpenAPI docs generation.' },
    { question: 'How would you handle background tasks in FastAPI?', category: 'technical', tip: 'Mention BackgroundTasks vs a proper task queue for heavier work.' },
  ],
  'PostgreSQL': [
    { question: 'How would you diagnose a slow query in PostgreSQL?', category: 'technical', tip: 'Mention EXPLAIN ANALYZE and looking for sequential scans on large tables.' },
    { question: 'When would you use a composite index vs two separate indexes?', category: 'technical', tip: 'Talk about query patterns that filter on multiple columns together.' },
  ],
  'MySQL': [
    { question: 'What is the difference between InnoDB and MyISAM storage engines?', category: 'technical', tip: 'Focus on transaction support and row-level locking as the key difference.' },
  ],
  'MongoDB': [
    { question: 'When would you choose a document database over a relational one?', category: 'technical', tip: 'Discuss schema flexibility vs the cost of losing joins and strict consistency.' },
    { question: 'How does indexing work differently in MongoDB vs a relational DB?', category: 'technical', tip: 'Mention compound indexes and the importance of matching query shape.' },
  ],
  'Redis': [
    { question: 'What are common use cases for Redis beyond caching?', category: 'technical', tip: 'Mention rate limiting, pub/sub, and session storage.' },
  ],
  'Supabase': [
    { question: 'How does Supabase\'s Row Level Security work under the hood?', category: 'technical', tip: 'Explain that policies are Postgres RLS rules evaluated per-request using auth.uid().' },
    { question: 'What is the difference between the anon key and the service role key?', category: 'technical', tip: 'Anon key respects RLS; service role bypasses it — explain why that matters for security.' },
  ],
  'AWS': [
    { question: 'How would you design a highly available web app on AWS?', category: 'technical', tip: 'Mention multi-AZ deployment, load balancers, and auto-scaling groups.' },
    { question: 'When would you use Lambda vs a container-based service like ECS?', category: 'technical', tip: 'Discuss cold starts, execution duration limits, and cost tradeoffs.' },
  ],
  'GCP': [
    { question: 'How does Google Cloud IAM differ from AWS IAM at a conceptual level?', category: 'technical', tip: 'Mention resource hierarchy (org/folder/project) and predefined vs custom roles.' },
  ],
  'Azure': [
    { question: 'How would you manage secrets for an app deployed on Azure?', category: 'technical', tip: 'Mention Azure Key Vault and managed identities over hardcoded secrets.' },
  ],
  'Docker': [
    { question: 'What is the difference between a Docker image and a container?', category: 'technical', tip: 'Image is the immutable blueprint; container is a running instance of it.' },
    { question: 'How would you reduce the size of a production Docker image?', category: 'technical', tip: 'Mention multi-stage builds and minimal base images like alpine or distroless.' },
  ],
  'Kubernetes': [
    { question: 'What is the difference between a Deployment and a StatefulSet?', category: 'technical', tip: 'StatefulSets provide stable network identity and storage for stateful workloads.' },
    { question: 'How does a Kubernetes readiness probe differ from a liveness probe?', category: 'technical', tip: 'Readiness controls traffic routing; liveness controls restarts.' },
  ],
  'CI/CD': [
    { question: 'What would you include in a good CI pipeline for a web app?', category: 'technical', tip: 'Mention linting, type-checking, tests, and a build step before any deploy.' },
    { question: 'How do you handle secrets safely in a CI/CD pipeline?', category: 'technical', tip: 'Mention encrypted environment variables or a secrets manager, never committing secrets.' },
  ],
  'GraphQL': [
    { question: 'How does GraphQL solve the over-fetching problem of REST?', category: 'technical', tip: 'Clients specify exactly the fields they need in a single request.' },
    { question: 'What is the N+1 query problem in GraphQL and how do you solve it?', category: 'technical', tip: 'Mention DataLoader-style batching to coalesce resolver calls.' },
  ],
  'REST': [
    { question: 'What makes an API RESTful versus just using HTTP?', category: 'technical', tip: 'Mention resource-based URLs, statelessness, and proper HTTP verb/status usage.' },
  ],
  'Tailwind': [
    { question: 'What are the tradeoffs of utility-first CSS like Tailwind vs component-scoped CSS?', category: 'technical', tip: 'Discuss faster iteration and consistency vs verbose markup.' },
  ],
  'CSS': [
    { question: 'Explain the CSS box model.', category: 'technical', tip: 'Cover content, padding, border, margin, and box-sizing behavior.' },
    { question: 'What is the difference between flexbox and CSS grid, and when do you use each?', category: 'technical', tip: 'Flexbox for one-dimensional layout, grid for two-dimensional.' },
  ],
  'HTML': [
    { question: 'Why does semantic HTML matter for accessibility and SEO?', category: 'technical', tip: 'Mention screen readers, ARIA roles, and how it affects search indexing.' },
  ],
  'Git': [
    { question: 'How would you resolve a merge conflict in a shared branch?', category: 'technical', tip: 'Describe the process, not just the git commands — communication with teammates matters too.' },
    { question: 'What is the difference between git merge and git rebase?', category: 'technical', tip: 'Discuss history preservation vs a linear, cleaner history, and when each is appropriate.' },
  ],
  'Agile': [
    { question: 'How do you handle scope creep mid-sprint?', category: 'rolefit', tip: 'Talk about communicating impact to the team/PO rather than silently absorbing it.' },
  ],
  'Scrum': [
    { question: 'What is the purpose of a retrospective, and how do you make one actually useful?', category: 'rolefit', tip: 'Emphasize actionable follow-ups, not just venting.' },
  ],
  'Figma': [
    { question: 'How do you collaborate with designers when a Figma spec is ambiguous?', category: 'rolefit', tip: 'Mention asking clarifying questions early rather than guessing and reworking later.' },
  ],
  'Remote': [
    { question: 'How do you stay productive and communicative on a fully remote team?', category: 'rolefit', tip: 'Give concrete habits — async updates, documenting decisions, overlap hours.' },
  ],
}

export function getQuestionsForJob(tags: string[]): InterviewQuestion[] {
  const tagQuestions = tags.flatMap((tag) => questionBank[tag] ?? [])
  return [...universalQuestions, ...tagQuestions]
}
