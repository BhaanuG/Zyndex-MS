import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, BookOpen, HelpCircle, UserCircle, MessageSquare, ChevronDown, ChevronRight, FileText, X, ArrowLeft, Clock, ThumbsUp, ThumbsDown, Shield, Lightbulb, Wrench, Grid3x3, List, Layers } from 'lucide-react';
import PublicLayout from '@/app/components/PublicLayout';
import '../styles/help-articles.css';
import { additionalHelpArticles } from '../data/additionalHelpArticles';
import { additionalHelpArticles2 } from '../data/additionalHelpArticles2';

export default function HelpCenter() {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCategory, setExpandedCategory] = useState(null);
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [articleFeedback, setArticleFeedback] = useState({});
  const [viewMode, setViewMode] = useState('toc'); // 'category' | 'grid' | 'all' | 'toc'
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('all');

  // Comprehensive help articles database based on actual Zyndex features (100 articles total)
  const baseHelpArticles = [
    // Getting Started (10 articles)
    {
      id: 1,
      category: 'Getting Started',
      title: 'How to create an account',
      description: 'Step-by-step guide to register on Zyndex with your academic role',
      content: `
        <h2>Creating Your Zyndex Account</h2>
        <p>Welcome to Zyndex Educational Resource Platform! Follow these simple steps to create your account:</p>
        <h3>For Reader & Academic Accounts:</h3>
        <ol>
          <li>Visit the Zyndex Login page.</li>
          <li>Select the <strong>"User Access"</strong> tab and switch to <strong>"Sign Up"</strong>.</li>
          <li>Enter your full name and a valid email address.</li>
          <li>Choose your personalized <strong>"I Am"</strong> academic profile role (Student, Faculty / Professor, Researcher, Librarian, Independent Scholar, or Professional Reader) — this customizes your reader badge across your workspace.</li>
          <li>Create a secure password with at least 8 characters.</li>
          <li>Click <strong>"Create Account"</strong>.</li>
          <li>Complete the 2-Step Email OTP Security Verification with high-speed dynamic geometric shape morphing.</li>
          <li>You'll be instantly redirected to your personalized User Dashboard.</li>
        </ol>
        <h3>For Admin Accounts:</h3>
        <p>Admin access requires administrative verification. Visit the "Admin Request" page from the login screen to submit your institutional request with designation and purpose. Our compliance team reviews requests within 24-48 business hours with automated email updates.</p>
        <h3>Important Tips:</h3>
        <ul>
          <li>Provide an active email address to receive your 4-digit verification and security handshakes.</li>
          <li>Ensure your academic profile role matches your field of study for customized resource recommendations.</li>
          <li>Keep your login credentials strictly private.</li>
        </ul>
      `,
      tags: ['account', 'register', 'signup', 'create', 'getting started', 'user', 'admin', 'role'],
      readTime: '3 min read'
    },
    {
      id: 2,
      category: 'Getting Started',
      title: 'Understanding the Security Verification',
      description: 'How the 2-step OTP email handshake and geometric morphing work',
      content: `
        <h2>Security Verification Process</h2>
        <p>Every login and account registration on Zyndex is guarded by an enterprise-grade 2-Step Email Verification system.</p>
        <h3>What is Security Verification?</h3>
        <p>Whenever you sign up or log in, Zyndex sends a cryptographically signed, single-use 4-digit numeric OTP to your registered email address with a 5-minute validity window.</p>
        <h3>The Verification Experience:</h3>
        <ol>
          <li>Enter your email and credentials on the Login screen.</li>
          <li>You are transitioned to the Security Authenticator screen.</li>
          <li>Notice the modern, interactive input boxes: as you enter digits, input tiles morph dynamically from diamond orientation into smooth circular tokens.</li>
          <li>Upon entering all four digits, the tokens animate smoothly through a randomized constellation sequence of 3 to 6 geometric shapes (Square, Circle, Diamond, Triangle with central apex, Polygon) before concluding verification.</li>
          <li>Check your registered inbox (or copy the code directly using the one-click copy button in the responsive email template) and enter the 4 digits to authenticate.</li>
        </ol>
        <h3>Why This Verification?</h3>
        <ul>
          <li>Eliminates credential stuffing and unauthorized automated access.</li>
          <li>Validates email ownership in real-time without storing sensitive device identifiers.</li>
          <li>Protects reader history, personal favorites, and academic session telemetry.</li>
        </ul>
      `,
      tags: ['security', 'verification', 'authenticator', 'otp', 'email', 'shapes', 'morphing', 'safety'],
      readTime: '3 min read'
    },
    {
      id: 3,
      category: 'Getting Started',
      title: 'Navigating the User Dashboard',
      description: 'Understanding your Zyndex User home page',
      content: `
        <h2>Your User Dashboard Overview</h2>
        <p>Your dashboard is the central hub for accessing educational resources.</p>
        <h3>Main Sections:</h3>
        <ul>
          <li><strong>Search Bar:</strong> Quick search for any resource</li>
          <li><strong>Category Cards:</strong> Browse resources by subject</li>
          <li><strong>Featured Resources:</strong> Curated content for you</li>
          <li><strong>Quick Stats:</strong> Your favorite counts</li>
        </ul>
        <h3>Available Categories:</h3>
        <ul>
          <li>Science (Physics, Chemistry, Biology)</li>
          <li>Mathematics (Algebra, Calculus, Geometry)</li>
          <li>Literature (Classic and Contemporary)</li>
          <li>History (World History, US History)</li>
        </ul>
        <h3>Navigation Menu:</h3>
        <p>The sidebar provides quick access to:</p>
        <ul>
          <li>Home Dashboard</li>
          <li>Search & Browse</li>
          <li>My Favourites</li>
          <li>My Profile</li>
        </ul>
      `,
      tags: ['dashboard', 'navigation', 'interface', 'home', 'user'],
      readTime: '4 min read'
    },
    {
      id: 4,
      category: 'Getting Started',
      title: 'Navigating the Admin Dashboard',
      description: 'Understanding your Zyndex Admin control panel',
      content: `
        <h2>Admin Dashboard Overview</h2>
        <p>The Admin Dashboard provides powerful tools for managing resources and users.</p>
        <h3>Key Features:</h3>
        <ul>
          <li><strong>Dashboard:</strong> View statistics and analytics</li>
          <li><strong>Upload Resource:</strong> Add new educational materials</li>
          <li><strong>Resource Management:</strong> Edit and organize content</li>
          <li><strong>User Access:</strong> Manage user permissions</li>
          <li><strong>Feedback Review:</strong> Read and respond to user feedback</li>
          <li><strong>My Profile:</strong> Admin account settings</li>
        </ul>
        <h3>Resizable Sidebar:</h3>
        <p>The admin sidebar is resizable! Drag the handle to adjust the width between 15-30% of screen space for optimal workflow.</p>
        <h3>Quick Actions:</h3>
        <p>Toggle the sidebar with the menu button for more screen space when needed.</p>
      `,
      tags: ['admin', 'dashboard', 'navigation', 'management', 'sidebar'],
      readTime: '4 min read'
    },
    {
      id: 5,
      category: 'Getting Started',
      title: 'Setting up your profile',
      description: 'Customize your profile settings',
      content: `
        <h2>Personalizing Your Profile</h2>
        <p>Make your Zyndex experience unique by customizing your profile:</p>
        <h3>Accessing Profile Settings:</h3>
        <ol>
          <li>Click on your profile icon in the navigation</li>
          <li>Select "My Profile" or "Account Settings" tab</li>
          <li>Click "Edit Profile" button</li>
        </ol>
        <h3>Editable Profile Information:</h3>
        <ul>
          <li><strong>Name:</strong> Update your display name</li>
          <li><strong>Email:</strong> Change your email address</li>
          <li><strong>Profile Picture:</strong> Your initial appears in a colored circle</li>
        </ul>
        <h3>Saving Changes:</h3>
        <p>After editing, click "Save Changes" to update your profile. Click "Cancel" to discard changes.</p>
      `,
      tags: ['profile', 'settings', 'customize', 'preferences', 'edit'],
      readTime: '3 min read'
    },
    {
      id: 6,
      category: 'Getting Started',
      title: 'Understanding user roles',
      description: 'Learn about User and Admin accounts',
      content: `
        <h2>User Roles on Zyndex</h2>
        <p>Zyndex has two main account types with different capabilities:</p>
        <h3>User Account Features:</h3>
        <ul>
          <li>Browse and search educational resources</li>
          <li>View and access materials online</li>
          <li>Save favorite resources</li>
          <li>Access all public pages</li>
          <li>Submit feedback through contact form</li>
        </ul>
        <h3>Admin Account Features:</h3>
        <ul>
          <li>All user capabilities</li>
          <li>Upload new educational resources</li>
          <li>Manage and edit existing content</li>
          <li>Review user feedback</li>
          <li>Manage user access and permissions</li>
          <li>View analytics and statistics</li>
          <li>Resizable admin sidebar for better workflow</li>
        </ul>
        <h3>How to Get Admin Access:</h3>
        <p>Click "Need admin access? Request Here" on the login page to submit an application.</p>
      `,
      tags: ['roles', 'account types', 'admin', 'user', 'permissions', 'access'],
      readTime: '4 min read'
    },
    {
      id: 7,
      category: 'Getting Started',
      title: 'Requesting admin access',
      description: 'How to apply for an admin account',
      content: `
        <h2>Admin Account Application</h2>
        <p>Need admin privileges? Here's how to request access:</p>
        <h3>Application Process:</h3>
        <ol>
          <li>Go to the Login page</li>
          <li>Select "Admin Access" tab</li>
          <li>Click "Need admin access? Request Here"</li>
          <li>Fill out the Admin Request form:
            <ul>
              <li>Full Name</li>
              <li>Display Name</li>
              <li>Email Address</li>
              <li>Desired Password</li>
            </ul>
          </li>
          <li>Submit your request</li>
        </ol>
        <h3>What Happens Next:</h3>
        <p>Your request is sent via secure email to the Zyndex admin team. You'll receive a response within 24-48 business hours.</p>
        <h3>Tips for Approval:</h3>
        <ul>
          <li>Use a professional email address</li>
          <li>Provide accurate information</li>
          <li>Explain your intended use (if there's a message field)</li>
        </ul>
      `,
      tags: ['admin request', 'application', 'access', 'approval', 'admin'],
      readTime: '3 min read'
    },
    {
      id: 8,
      category: 'Getting Started',
      title: 'Mobile responsive design',
      description: 'Using Zyndex on mobile devices',
      content: `
        <h2>Zyndex Mobile Experience</h2>
        <p>Access Zyndex seamlessly on any device - desktop, tablet, or mobile.</p>
        <h3>Mobile Features:</h3>
        <ul>
          <li>Fully responsive design for all screen sizes</li>
          <li>Touch-optimized interface</li>
          <li>Mobile-friendly navigation menu</li>
          <li>Collapsible hamburger menu on login page</li>
          <li>Optimized search and browse experience</li>
        </ul>
        <h3>Mobile Tips:</h3>
        <ul>
          <li>Bookmark Zyndex for quick access</li>
          <li>Use landscape mode for reading resources</li>
          <li>The admin sidebar auto-collapses on small screens</li>
        </ul>
      `,
      tags: ['mobile', 'responsive', 'touch', 'devices', 'tablet'],
      readTime: '3 min read'
    },
    {
      id: 9,
      category: 'Getting Started',
      title: 'The orange theme design',
      description: 'Understanding Zyndex visual design',
      content: `
        <h2>Zyndex Design Language</h2>
        <p>Zyndex features a professional orange-themed design throughout the application.</p>
        <h3>Design Elements:</h3>
        <ul>
          <li><strong>Color Palette:</strong> Orange, red, and amber gradients</li>
          <li><strong>Smooth Animations:</strong> Motion effects on interactions</li>
          <li><strong>Page Transitions:</strong> 5-second rotating book animation</li>
          <li><strong>Clean Layout:</strong> White backgrounds with orange accents</li>
          <li><strong>Modern Typography:</strong> Easy-to-read fonts</li>
        </ul>
        <h3>Accessibility:</h3>
        <p>The orange theme is designed with accessibility in mind, providing good contrast and readability.</p>
      `,
      tags: ['design', 'theme', 'orange', 'UI', 'interface', 'visual'],
      readTime: '2 min read'
    },
    {
      id: 10,
      category: 'Getting Started',
      title: 'Page transition animations',
      description: 'The rotating book loader',
      content: `
        <h2>Zyndex Page Transitions</h2>
        <p>Every page navigation includes a delightful 5-second rotating book animation.</p>
        <h3>What is the Book Animation?</h3>
        <p>When navigating between pages, you'll see an animated rotating book that represents knowledge and learning.</p>
        <h3>When Does It Appear?</h3>
        <ul>
          <li>Navigating from login to dashboard</li>
          <li>Moving between admin pages</li>
          <li>Switching user sections</li>
          <li>Accessing public pages</li>
        </ul>
        <h3>Why 5 Seconds?</h3>
        <p>The animation provides a smooth transition while the page loads, creating a pleasant user experience.</p>
      `,
      tags: ['animation', 'transition', 'loading', 'book', 'effects'],
      readTime: '2 min read'
    },

    // Finding Resources (15 articles)
    {
      id: 11,
      category: 'Finding Resources',
      title: 'How to search for resources',
      description: 'Using the Zyndex search feature',
      content: `
        <h2>Searching on Zyndex</h2>
        <p>Find educational materials quickly with our powerful search:</p>
        <h3>Basic Search:</h3>
        <ol>
          <li>Enter keywords in the search bar on your dashboard</li>
          <li>Press Enter or click the search icon</li>
          <li>Browse the results on the Search Results page</li>
        </ol>
        <h3>Search Tips:</h3>
        <ul>
          <li>Use specific keywords (e.g., "photosynthesis worksheet")</li>
          <li>Try subject names (Science, Math, Literature)</li>
          <li>Search by topic or grade level</li>
          <li>Use quotation marks for exact phrases</li>
        </ul>
        <h3>Search Features:</h3>
        <ul>
          <li>Real-time search results</li>
          <li>Filter by category</li>
          <li>Sort by relevance</li>
        </ul>
      `,
      tags: ['search', 'find', 'resources', 'materials', 'query'],
      readTime: '3 min read'
    },
    {
      id: 12,
      category: 'Finding Resources',
      title: 'Browsing by category',
      description: 'Explore resources by subject area',
      content: `
        <h2>Browse Categories</h2>
        <p>Zyndex organizes resources into easy-to-navigate categories:</p>
        <h3>Available Categories:</h3>
        <ul>
          <li><strong>Science:</strong> Physics, Chemistry, Biology, and more</li>
          <li><strong>Mathematics:</strong> Algebra, Calculus, Geometry, Statistics</li>
          <li><strong>Literature:</strong> Classic and contemporary works</li>
          <li><strong>History:</strong> World History, US History, Geography</li>
        </ul>
        <h3>How to Browse:</h3>
        <ol>
          <li>Click on a category card from your dashboard</li>
          <li>Or navigate to Resources > Browse/Categories</li>
          <li>Select a subcategory to narrow your search</li>
          <li>View all resources in that category</li>
        </ol>
      `,
      tags: ['browse', 'category', 'subject', 'topics', 'organize'],
      readTime: '3 min read'
    },
    {
      id: 13,
      category: 'Finding Resources',
      title: 'Saving favorite resources',
      description: 'Bookmark resources for later access',
      content: `
        <h2>My Favourites Feature</h2>
        <p>Save resources you love for quick access later:</p>
        <h3>How to Save Favorites:</h3>
        <ol>
          <li>Browse or search for resources</li>
          <li>Click the heart icon on a resource card</li>
          <li>The resource is added to "My Favourites"</li>
        </ol>
        <h3>Accessing Your Favorites:</h3>
        <ol>
          <li>Go to "My Profile"</li>
          <li>Click the "My Favourites" tab</li>
          <li>View all your saved resources</li>
          <li>Click any item to view details</li>
        </ol>
        <h3>Managing Favorites:</h3>
        <p>You can remove items from favorites anytime by clicking the heart icon again.</p>
      `,
      tags: ['favorites', 'favourites', 'save', 'bookmark', 'heart'],
      readTime: '3 min read'
    },
    {
      id: 14,
      category: 'Finding Resources',
      title: 'Downloading materials',
      description: 'Download resources for offline use',
      content: `
        <h2>Downloading Resources</h2>
        <p>Access educational materials offline by downloading them:</p>
        <h3>Download Process:</h3>
        <ol>
          <li>Find a resource through search or browse</li>
          <li>Click on the resource to view details</li>
          <li>Click the "Download" button</li>
          <li>The file will save to your device</li>
        </ol>
        <h3>Download History:</h3>
        <p>Track all your downloads:</p>
        <ol>
          <li>Go to "My Profile"</li>
          <li>Click "My Downloads" tab</li>
          <li>View complete download history</li>
          <li>Re-download any previous resource</li>
        </ol>
        <h3>Supported Formats:</h3>
        <ul>
          <li>PDF documents</li>
          <li>Image files</li>
          <li>Video content</li>
          <li>Interactive materials</li>
        </ul>
      `,
      tags: ['download', 'save', 'offline', 'materials', 'files'],
      readTime: '3 min read'
    },
    {
      id: 15,
      category: 'Finding Resources',
      title: 'Viewing resource details',
      description: 'Understanding the resource detail page',
      content: `
        <h2>Resource Detail Page</h2>
        <p>Each resource has a dedicated detail page with comprehensive information:</p>
        <h3>What You'll See:</h3>
        <ul>
          <li><strong>Title:</strong> Resource name</li>
          <li><strong>Description:</strong> Detailed overview</li>
          <li><strong>Category & Subject:</strong> Classification</li>
          <li><strong>Grade Level:</strong> Recommended age/grade</li>
          <li><strong>File Type:</strong> Format information</li>
          <li><strong>Preview:</strong> Sample of the content</li>
          <li><strong>Actions:</strong> Download, Favorite, Share buttons</li>
        </ul>
        <h3>Quick Actions:</h3>
        <p>From the detail page, you can quickly download, save to favorites, or share the resource.</p>
      `,
      tags: ['resource detail', 'view', 'information', 'preview'],
      readTime: '3 min read'
    },
    {
      id: 16,
      category: 'Finding Resources',
      title: 'Search results page',
      description: 'Understanding search results and filters',
      content: `
        <h2>Search Results</h2>
        <p>After searching or browsing a category, you'll see the Search Results page.</p>
        <h3>Results Display:</h3>
        <ul>
          <li>Grid or list view of resources</li>
          <li>Resource cards with key information</li>
          <li>Quick actions (view, download, favorite)</li>
          <li>Result count and pagination</li>
        </ul>
        <h3>Filtering Results:</h3>
        <p>Narrow your results using:</p>
        <ul>
          <li>Category filters</li>
          <li>Grade level filters</li>
          <li>Resource type filters</li>
          <li>Sort options (newest, popular, alphabetical)</li>
        </ul>
      `,
      tags: ['search results', 'filter', 'browse', 'display'],
      readTime: '3 min read'
    },
    {
      id: 17,
      category: 'Finding Resources',
      title: 'Featured and recommended resources',
      description: 'Discovering curated content',
      content: `
        <h2>Featured Resources</h2>
        <p>Zyndex highlights quality resources on your dashboard:</p>
        <h3>Featured Content:</h3>
        <ul>
          <li>High-quality materials selected by educators</li>
          <li>Seasonal and timely content</li>
          <li>Popular resources in your areas of interest</li>
          <li>New additions worth exploring</li>
        </ul>
        <h3>How Content is Featured:</h3>
        <p>Our admin team curates featured resources based on quality ratings, popularity, and educational value.</p>
      `,
      tags: ['featured', 'recommended', 'curated', 'popular'],
      readTime: '2 min read'
    },
    {
      id: 18,
      category: 'Finding Resources',
      title: 'Science resources',
      description: 'Exploring science materials',
      content: `
        <h2>Science Category</h2>
        <p>Access comprehensive science resources across multiple disciplines:</p>
        <h3>Available Topics:</h3>
        <ul>
          <li><strong>Physics:</strong> Mechanics, thermodynamics, electromagnetism</li>
          <li><strong>Chemistry:</strong> Organic, inorganic, biochemistry</li>
          <li><strong>Biology:</strong> Cell biology, genetics, ecology</li>
          <li><strong>Earth Science:</strong> Geology, meteorology, astronomy</li>
        </ul>
        <h3>Resource Types:</h3>
        <ul>
          <li>Lab worksheets and experiments</li>
          <li>Lesson plans and curriculum guides</li>
          <li>Interactive simulations</li>
          <li>Video demonstrations</li>
        </ul>
      `,
      tags: ['science', 'physics', 'chemistry', 'biology', 'resources'],
      readTime: '3 min read'
    },
    {
      id: 19,
      category: 'Finding Resources',
      title: 'Mathematics resources',
      description: 'Exploring math materials',
      content: `
        <h2>Mathematics Category</h2>
        <p>Find resources for all levels of mathematics:</p>
        <h3>Available Topics:</h3>
        <ul>
          <li><strong>Algebra:</strong> Linear equations, polynomials, functions</li>
          <li><strong>Geometry:</strong> Shapes, angles, proofs, trigonometry</li>
          <li><strong>Calculus:</strong> Derivatives, integrals, series</li>
          <li><strong>Statistics:</strong> Data analysis, probability</li>
        </ul>
        <h3>Resource Types:</h3>
        <ul>
          <li>Practice worksheets with solutions</li>
          <li>Problem sets and assessments</li>
          <li>Visual aids and diagrams</li>
          <li>Video tutorials</li>
        </ul>
      `,
      tags: ['mathematics', 'math', 'algebra', 'calculus', 'geometry'],
      readTime: '3 min read'
    },
    {
      id: 20,
      category: 'Finding Resources',
      title: 'Literature resources',
      description: 'Exploring literature materials',
      content: `
        <h2>Literature Category</h2>
        <p>Access resources for teaching literature and language arts:</p>
        <h3>Available Topics:</h3>
        <ul>
          <li><strong>Classic Literature:</strong> Canonical works and analysis</li>
          <li><strong>Contemporary Fiction:</strong> Modern works</li>
          <li><strong>Poetry:</strong> Analysis and interpretation</li>
          <li><strong>Drama:</strong> Plays and theatrical works</li>
        </ul>
        <h3>Resource Types:</h3>
        <ul>
          <li>Study guides and analysis</li>
          <li>Discussion questions</li>
          <li>Writing prompts</li>
          <li>Reading comprehension materials</li>
        </ul>
      `,
      tags: ['literature', 'reading', 'english', 'books', 'writing'],
      readTime: '3 min read'
    },
    {
      id: 21,
      category: 'Finding Resources',
      title: 'History resources',
      description: 'Exploring history materials',
      content: `
        <h2>History Category</h2>
        <p>Find resources covering various historical periods and topics:</p>
        <h3>Available Topics:</h3>
        <ul>
          <li><strong>World History:</strong> Ancient to modern civilizations</li>
          <li><strong>US History:</strong> Colonial era to present day</li>
          <li><strong>Geography:</strong> World cultures and places</li>
          <li><strong>Social Studies:</strong> Government, economics, society</li>
        </ul>
        <h3>Resource Types:</h3>
        <ul>
          <li>Timeline activities</li>
          <li>Primary source documents</li>
          <li>Maps and visual aids</li>
          <li>Essay prompts and projects</li>
        </ul>
      `,
      tags: ['history', 'social studies', 'geography', 'civics'],
      readTime: '3 min read'
    },
    {
      id: 22,
      category: 'Finding Resources',
      title: 'Resource quality and ratings',
      description: 'How resources are evaluated',
      content: `
        <h2>Resource Quality</h2>
        <p>All resources on Zyndex are reviewed for quality and accuracy:</p>
        <h3>Quality Standards:</h3>
        <ul>
          <li>Educational value and accuracy</li>
          <li>Clear and appropriate content</li>
          <li>Proper formatting and readability</li>
          <li>Relevant to stated grade level</li>
        </ul>
        <h3>User Ratings:</h3>
        <p>Resources can be rated by users to help others find the best materials.</p>
        <h3>Admin Review:</h3>
        <p>Admin team members review uploaded content to ensure it meets Zyndex standards.</p>
      `,
      tags: ['quality', 'ratings', 'review', 'standards'],
      readTime: '2 min read'
    },
    {
      id: 23,
      category: 'Finding Resources',
      title: 'Empty state in downloads and favorites',
      description: 'What to see when lists are empty',
      content: `
        <h2>Empty States</h2>
        <p>When you first use Zyndex, your Downloads and Favourites will be empty.</p>
        <h3>My Downloads:</h3>
        <p>When empty, you'll see:</p>
        <ul>
          <li>A download icon</li>
          <li>"No downloads yet" message</li>
          <li>"Your download history will appear here" subtitle</li>
        </ul>
        <h3>My Favourites:</h3>
        <p>When empty, you'll see:</p>
        <ul>
          <li>A heart icon</li>
          <li>"No favourites yet" message</li>
          <li>"Resources you mark as favourite will appear here" subtitle</li>
        </ul>
        <p>Start exploring and saving resources to populate these sections!</p>
      `,
      tags: ['empty', 'downloads', 'favorites', 'new user'],
      readTime: '2 min read'
    },
    {
      id: 24,
      category: 'Finding Resources',
      title: 'Resource file formats',
      description: 'Understanding different file types',
      content: `
        <h2>File Formats</h2>
        <p>Zyndex supports various file formats for different types of resources:</p>
        <h3>Common Formats:</h3>
        <ul>
          <li><strong>PDF:</strong> Documents, worksheets, guides</li>
          <li><strong>DOCX:</strong> Editable Word documents</li>
          <li><strong>PPTX:</strong> Presentations and slides</li>
          <li><strong>MP4:</strong> Video content</li>
          <li><strong>MP3:</strong> Audio recordings</li>
          <li><strong>JPG/PNG:</strong> Images and diagrams</li>
        </ul>
        <h3>Viewing Files:</h3>
        <p>Most files can be previewed before downloading. PDFs and images typically have inline previews.</p>
      `,
      tags: ['formats', 'files', 'PDF', 'documents', 'types'],
      readTime: '2 min read'
    },
    {
      id: 25,
      category: 'Finding Resources',
      title: 'Subject-specific filters',
      description: 'Narrow searches by subject area',
      content: `
        <h2>Subject Filtering</h2>
        <p>Refine your search results using subject-specific filters:</p>
        <h3>How to Filter:</h3>
        <ol>
          <li>Perform a search or browse</li>
          <li>Look for the filter sidebar</li>
          <li>Select your subject of interest</li>
          <li>Results update automatically</li>
        </ol>
        <h3>Available Subjects:</h3>
        <p>Filters are available for all major subject categories, including subcategories like Biology, Algebra, US History, etc.</p>
      `,
      tags: ['filter', 'subject', 'refine', 'search', 'narrow'],
      readTime: '2 min read'
    },

    // Account Management (15 articles)
    {
      id: 26,
      category: 'Account Management',
      title: 'Editing your profile',
      description: 'Update your personal information',
      content: `
        <h2>Profile Editing</h2>
        <p>Keep your profile information current:</p>
        <h3>Edit Process:</h3>
        <ol>
          <li>Navigate to My Profile</li>
          <li>Click "Edit Profile" button</li>
          <li>Update your information</li>
          <li>Click "Save Changes"</li>
        </ol>
        <h3>Editable Fields:</h3>
        <ul>
          <li>Display Name</li>
          <li>Email Address</li>
        </ul>
        <h3>Tips:</h3>
        <ul>
          <li>Use a valid email you check regularly</li>
          <li>Keep your name professional</li>
        </ul>
      `,
      tags: ['profile', 'edit', 'update', 'settings', 'personal'],
      readTime: '3 min read'
    },
    {
      id: 27,
      category: 'Account Management',
      title: 'Changing your password',
      description: 'Security and password management',
      content: `
        <h2>Password Management</h2>
        <p>Secure your account with a strong password:</p>
        <h3>Password Requirements:</h3>
        <ul>
          <li>Minimum 8 characters</li>
          <li>Mix of letters, numbers, and symbols recommended</li>
          <li>Avoid common words or personal information</li>
        </ul>
        <h3>Changing Your Password:</h3>
        <ol>
          <li>Go to Account Settings</li>
          <li>Find the "Change Password" section</li>
          <li>Enter current password</li>
          <li>Enter new password twice</li>
          <li>Save changes</li>
        </ol>
      `,
      tags: ['password', 'security', 'change', 'reset', 'account'],
      readTime: '3 min read'
    },
    {
      id: 28,
      category: 'Account Management',
      title: 'Forgot password recovery',
      description: 'Reset your password if forgotten',
      content: `
        <h2>Password Recovery</h2>
        <p>Forgot your password? Here's how to recover access:</p>
        <h3>Recovery Process:</h3>
        <ol>
          <li>Go to the Login page</li>
          <li>Click "Reset or Forgot your password?"</li>
          <li>Select User or Admin role</li>
          <li>Enter your email address</li>
          <li>Submit the reset request</li>
          <li>Check your email for reset instructions</li>
        </ol>
        <h3>What Happens:</h3>
        <p>A password reset email is sent through the configured SMTP mail service to your registered email address.</p>
      `,
      tags: ['forgot password', 'reset', 'recovery', 'email', 'access'],
      readTime: '3 min read'
    },
    {
      id: 29,
      category: 'Account Management',
      title: 'Understanding the profile layout',
      description: 'Navigate your profile page effectively',
      content: `
        <h2>Profile Page Structure</h2>
        <p>Your profile page has two main sections:</p>
        <h3>Left Column:</h3>
        <ul>
          <li>Profile card with avatar</li>
          <li>Name and email</li>
          <li>Member since information</li>
          <li>Role badge (for admins)</li>
        </ul>
        <h3>Right Column:</h3>
        <ul>
          <li>Tabbed interface</li>
          <li>My Downloads</li>
          <li>My Favourites</li>
          <li>Account Settings</li>
          <li>Content area for selected tab</li>
        </ul>
        <h3>Responsive Design:</h3>
        <p>On mobile devices, the layout stacks vertically for better readability.</p>
      `,
      tags: ['layout', 'structure', 'profile', 'design', 'organization'],
      readTime: '2 min read'
    },
    {
      id: 30,
      category: 'Account Management',
      title: 'Re-downloading previous resources',
      description: 'Accessing previously downloaded materials',
      content: `
        <h2>Re-Download Resources</h2>
        <p>Access any resource you've previously downloaded:</p>
        <h3>How to Re-Download:</h3>
        <ol>
          <li>Go to "My Profile"</li>
          <li>Click "My Downloads" tab</li>
          <li>Find the resource in your history</li>
          <li>Click "Download Again" button</li>
          <li>File downloads to your device</li>
        </ol>
        <h3>Benefits:</h3>
        <ul>
          <li>No need to search again</li>
          <li>Quick access to previously used materials</li>
          <li>Perfect for recurring needs</li>
          <li>Complete download history maintained</li>
        </ul>
      `,
      tags: ['re-download', 'history', 'access', 'previous', 'materials'],
      readTime: '2 min read'
    },
    {
      id: 31,
      category: 'Account Management',
      title: 'Form validation in profile editing',
      description: 'Understanding profile update requirements',
      content: `
        <h2>Profile Update Validation</h2>
        <p>When editing your profile, certain rules apply:</p>
        <h3>Required Fields:</h3>
        <ul>
          <li><strong>Name:</strong> Cannot be empty</li>
          <li><strong>Email:</strong> Must be valid email format</li>
        </ul>
        <h3>Input Features:</h3>
        <ul>
          <li>Fields highlight in orange when focused</li>
          <li>Disabled fields are grayed out</li>
          <li>Icons indicate field type</li>
          <li>Smooth transitions and animations</li>
        </ul>
      `,
      tags: ['validation', 'form', 'editing', 'requirements', 'profile'],
      readTime: '2 min read'
    },
    {
      id: 32,
      category: 'Account Management',
      title: 'Profile animations and interactions',
      description: 'Interactive elements on profile page',
      content: `
        <h2>Profile Interactions</h2>
        <p>The profile page features smooth animations and interactions:</p>
        <h3>Animated Elements:</h3>
        <ul>
          <li>Fade-in animation when page loads</li>
          <li>Smooth tab transitions</li>
          <li>Hover effects on buttons</li>
          <li>Scale animation on button clicks</li>
          <li>Slide animations for table rows</li>
        </ul>
        <h3>Interactive Features:</h3>
        <ul>
          <li>Clickable tabs</li>
          <li>Hoverable action buttons</li>
          <li>Smooth edit mode toggle</li>
          <li>Animated save confirmation</li>
        </ul>
      `,
      tags: ['animation', 'interaction', 'profile', 'effects', 'UX'],
      readTime: '2 min read'
    },
    {
      id: 33,
      category: 'Account Management',
      title: 'Logout process',
      description: 'How to securely sign out',
      content: `
        <h2>Logging Out</h2>
        <p>Sign out securely when you're done using Zyndex:</p>
        <h3>Logout Steps:</h3>
        <ol>
          <li>Click on your profile icon or menu</li>
          <li>Select "Logout" option</li>
          <li>Confirm logout action</li>
          <li>Watch the 10-second rotating book animation</li>
          <li>You'll be redirected to the login page</li>
        </ol>
        <h3>Why 10 Seconds?</h3>
        <p>The extended logout animation ensures proper session cleanup and provides a smooth transition.</p>
        <h3>Security Note:</h3>
        <p>Always logout when using shared or public computers.</p>
      `,
      tags: ['logout', 'sign out', 'security', 'exit', 'session'],
      readTime: '2 min read'
    },
    {
      id: 34,
      category: 'Account Management',
      title: 'Managing download history',
      description: 'View and organize your downloads',
      content: `
        <h2>Download History</h2>
        <p>Keep track of all resources you've downloaded:</p>
        <h3>Viewing History:</h3>
        <ol>
          <li>Navigate to My Profile</li>
          <li>Click "My Downloads" tab</li>
          <li>See a chronological list of downloads</li>
        </ol>
        <h3>Information Displayed:</h3>
        <ul>
          <li>Resource title</li>
          <li>Category</li>
          <li>Download date</li>
          <li>File type</li>
          <li>Re-download option</li>
        </ul>
        <h3>Uses:</h3>
        <ul>
          <li>Track your learning materials</li>
          <li>Find previously used resources</li>
          <li>Monitor your resource usage</li>
        </ul>
      `,
      tags: ['downloads', 'history', 'tracking', 'manage', 'resources'],
      readTime: '3 min read'
    },
    {
      id: 35,
      category: 'Account Management',
      title: 'Managing favorites',
      description: 'Organize your saved resources',
      content: `
        <h2>Favorites Management</h2>
        <p>Keep your favorite resources organized:</p>
        <h3>Viewing Favorites:</h3>
        <ol>
          <li>Go to My Profile</li>
          <li>Select "My Favourites" tab</li>
          <li>Browse your saved resources</li>
        </ol>
        <h3>Managing Favorites:</h3>
        <ul>
          <li>Click heart icon to remove from favorites</li>
          <li>View resource details</li>
          <li>Download favorited items</li>
          <li>Search within your favorites</li>
        </ul>
        <h3>Organization Tips:</h3>
        <ul>
          <li>Regularly review and update your favorites</li>
          <li>Remove outdated or unused items</li>
          <li>Use favorites for frequently accessed resources</li>
        </ul>
      `,
      tags: ['favorites', 'manage', 'organize', 'saved', 'resources'],
      readTime: '3 min read'
    },
    {
      id: 36,
      category: 'Account Management',
      title: 'Account security best practices',
      description: 'Keep your account safe',
      content: `
        <h2>Account Security</h2>
        <p>Protect your Zyndex account with these best practices:</p>
        <h3>Password Security:</h3>
        <ul>
          <li>Use a unique password (not used elsewhere)</li>
          <li>Change password periodically</li>
          <li>Never share your password</li>
          <li>Use a password manager if needed</li>
        </ul>
        <h3>Account Practices:</h3>
        <ul>
          <li>Always logout from shared devices</li>
          <li>Keep your email address current</li>
          <li>Review account activity regularly</li>
          <li>Complete security verification</li>
        </ul>
        <h3>If Compromised:</h3>
        <p>If you suspect unauthorized access, immediately reset your password and contact support.</p>
      `,
      tags: ['security', 'best practices', 'safety', 'protection', 'account'],
      readTime: '3 min read'
    },
    {
      id: 37,
      category: 'Account Management',
      title: 'Email notifications',
      description: 'Managing email communications',
      content: `
        <h2>Email Notifications</h2>
        <p>Stay informed about your Zyndex account activities:</p>
        <h3>Types of Emails:</h3>
        <ul>
          <li>Account creation confirmation</li>
          <li>Password reset requests</li>
          <li>Admin request confirmations</li>
          <li>Important updates</li>
        </ul>
        <h3>Email delivery:</h3>
        <p>Zyndex uses its configured SMTP mail service to send important communications.</p>
        <h3>Email Issues:</h3>
        <ul>
          <li>Check spam/junk folder</li>
          <li>Verify email address is correct</li>
          <li>Contact support if emails aren't arriving</li>
        </ul>
      `,
      tags: ['email', 'notifications', 'communications', 'smtp'],
      readTime: '3 min read'
    },
    {
      id: 38,
      category: 'Account Management',
      title: 'Profile avatar and display',
      description: 'Your profile picture and identity',
      content: `
        <h2>Profile Avatar</h2>
        <p>Your profile displays a personalized avatar:</p>
        <h3>Avatar Design:</h3>
        <ul>
          <li>Shows first letter of your name</li>
          <li>Colored circular background</li>
          <li>Color generated from your name</li>
          <li>Consistent across the platform</li>
        </ul>
        <h3>Where It Appears:</h3>
        <ul>
          <li>Navigation bar</li>
          <li>Profile page</li>
          <li>Comments and interactions</li>
          <li>Admin panels (for admins)</li>
        </ul>
        <h3>Customization:</h3>
        <p>Currently, avatars are auto-generated. Custom image uploads may be added in future updates.</p>
      `,
      tags: ['avatar', 'profile picture', 'display', 'identity'],
      readTime: '2 min read'
    },
    {
      id: 39,
      category: 'Account Management',
      title: 'Member since date',
      description: 'Understanding your account creation date',
      content: `
        <h2>Member Since</h2>
        <p>Your profile shows when you joined Zyndex:</p>
        <h3>What It Shows:</h3>
        <ul>
          <li>Exact date you created your account</li>
          <li>Displayed on your profile card</li>
          <li>Visible to you (not shared publicly)</li>
        </ul>
        <h3>Why It Matters:</h3>
        <ul>
          <li>Track how long you've been using Zyndex</li>
          <li>Reference for account history</li>
          <li>Milestone tracking</li>
        </ul>
      `,
      tags: ['member since', 'join date', 'account age', 'profile'],
      readTime: '2 min read'
    },
    {
      id: 40,
      category: 'Account Management',
      title: 'Role badges',
      description: 'Understanding user and admin badges',
      content: `
        <h2>Role Badges</h2>
        <p>Zyndex uses visual badges to indicate account roles:</p>
        <h3>User Badge:</h3>
        <ul>
          <li>Standard account indicator</li>
          <li>Appears on user profiles</li>
          <li>Blue/gray color scheme</li>
        </ul>
        <h3>Admin Badge:</h3>
        <ul>
          <li>Special admin role indicator</li>
          <li>Orange/amber color scheme</li>
          <li>Shows elevated permissions</li>
          <li>Displayed prominently on profile</li>
        </ul>
        <h3>Purpose:</h3>
        <p>Badges help identify account capabilities and permissions at a glance.</p>
      `,
      tags: ['badges', 'roles', 'admin', 'user', 'permissions'],
      readTime: '2 min read'
    },

    // Contact Support (10 articles)
    {
      id: 41,
      category: 'Contact Support',
      title: 'How to contact support',
      description: 'Get help from the Zyndex team',
      content: `
        <h2>Contacting Zyndex Support</h2>
        <p>Need help? We're here for you!</p>
        <h3>Contact Methods:</h3>
        <ul>
          <li><strong>Contact Form:</strong> Available on the Contact page</li>
          <li><strong>Email:</strong> Forms send through the configured SMTP service to the support team</li>
          <li><strong>Help Center:</strong> Browse self-service articles</li>
          <li><strong>FAQ:</strong> Quick answers to common questions</li>
        </ul>
        <h3>Using the Contact Form:</h3>
        <ol>
          <li>Navigate to About > Contact</li>
          <li>Fill out your name, email, and message</li>
          <li>Click "Send Message"</li>
          <li>Confirmation will appear on success</li>
        </ol>
        <h3>Response Time:</h3>
        <p>We typically respond within 24-48 business hours.</p>
      `,
      tags: ['support', 'contact', 'help', 'assistance', 'email'],
      readTime: '3 min read'
    },
    {
      id: 42,
      category: 'Contact Support',
      title: 'Using the contact form',
      description: 'How to submit inquiries via contact page',
      content: `
        <h2>Contact Form</h2>
        <p>The Contact page uses the configured SMTP service to send your messages securely:</p>
        <h3>Form Fields:</h3>
        <ul>
          <li><strong>Name:</strong> Your full name</li>
          <li><strong>Email:</strong> Your contact email</li>
          <li><strong>Message:</strong> Your question or concern</li>
        </ul>
        <h3>Submission Process:</h3>
        <ol>
          <li>Fill out all required fields</li>
          <li>Review your message</li>
          <li>Click "Send Message" button</li>
          <li>Wait for confirmation message</li>
        </ol>
        <h3>Email delivery:</h3>
        <p>Messages are sent securely using the server-side SMTP configuration.</p>
      `,
      tags: ['contact form', 'email', 'smtp', 'message', 'submit'],
      readTime: '3 min read'
    },
    {
      id: 43,
      category: 'Contact Support',
      title: 'Providing feedback',
      description: 'Share your thoughts about Zyndex',
      content: `
        <h2>User Feedback</h2>
        <p>We value your input! Share feedback to help us improve Zyndex:</p>
        <h3>Feedback Channels:</h3>
        <ul>
          <li><strong>Contact Form:</strong> General feedback and suggestions</li>
          <li><strong>Admin Review:</strong> Admins can review user feedback</li>
          <li><strong>Help Articles:</strong> Rate articles as helpful or not</li>
        </ul>
        <h3>What to Include:</h3>
        <ul>
          <li>Specific features you like or want improved</li>
          <li>Suggestions for new resources</li>
          <li>User experience observations</li>
          <li>Technical issues (be detailed)</li>
        </ul>
      `,
      tags: ['feedback', 'suggestions', 'improve', 'user input'],
      readTime: '2 min read'
    },
    {
      id: 44,
      category: 'Contact Support',
      title: 'Frequently Asked Questions',
      description: 'Quick answers to common questions',
      content: `
        <h2>FAQ Page</h2>
        <p>Visit the FAQ page for instant answers to common questions:</p>
        <h3>How to Access:</h3>
        <ul>
          <li>Navigate to Support > FAQ</li>
          <li>Or click "Frequently Asked Questions" from Quick Links</li>
        </ul>
        <h3>FAQ Topics:</h3>
        <ul>
          <li>Account management</li>
          <li>Resource access</li>
          <li>Technical troubleshooting</li>
          <li>Platform features</li>
        </ul>
        <h3>Interactive Features:</h3>
        <ul>
          <li>Collapsible question cards</li>
          <li>Search functionality</li>
          <li>Organized by category</li>
        </ul>
      `,
      tags: ['FAQ', 'questions', 'answers', 'help', 'support'],
      readTime: '2 min read'
    },
    {
      id: 45,
      category: 'Contact Support',
      title: 'Reporting technical issues',
      description: 'How to report bugs or problems',
      content: `
        <h2>Report Technical Issues</h2>
        <p>Encountered a bug or technical problem? Let us know:</p>
        <h3>What to Include:</h3>
        <ul>
          <li>Detailed description of the issue</li>
          <li>Steps to reproduce the problem</li>
          <li>Browser and device information</li>
          <li>Screenshots if applicable</li>
          <li>When the issue started</li>
        </ul>
        <h3>Reporting Methods:</h3>
        <ol>
          <li>Use the Contact form</li>
          <li>Select "Technical Issue" category if available</li>
          <li>Provide all relevant details</li>
          <li>Submit and await response</li>
        </ol>
        <h3>Response:</h3>
        <p>Our technical team will investigate and respond with a solution or timeline.</p>
      `,
      tags: ['technical', 'bug', 'issue', 'report', 'problem'],
      readTime: '3 min read'
    },
    {
      id: 46,
      category: 'Contact Support',
      title: 'Suggesting new features',
      description: 'Request new functionality',
      content: `
        <h2>Feature Suggestions</h2>
        <p>Have an idea for a new feature? We want to hear it!</p>
        <h3>How to Suggest:</h3>
        <ol>
          <li>Visit the Contact page</li>
          <li>Select "Feature Request" or use general message</li>
          <li>Describe your idea clearly</li>
          <li>Explain the benefit it would provide</li>
          <li>Submit your suggestion</li>
        </ol>
        <h3>What Happens Next:</h3>
        <ul>
          <li>Team reviews all suggestions</li>
          <li>Popular requests are prioritized</li>
          <li>You may receive updates on implementation</li>
        </ul>
      `,
      tags: ['features', 'suggestions', 'requests', 'ideas', 'improvements'],
      readTime: '2 min read'
    },
    {
      id: 47,
      category: 'Contact Support',
      title: 'Support response times',
      description: 'When to expect a reply',
      content: `
        <h2>Response Times</h2>
        <p>Here's what to expect when contacting support:</p>
        <h3>Standard Inquiries:</h3>
        <ul>
          <li>Response within 24-48 business hours</li>
          <li>General questions and feedback</li>
          <li>Account-related queries</li>
        </ul>
        <h3>Urgent Issues:</h3>
        <ul>
          <li>Priority handling for critical bugs</li>
          <li>Faster response for account access issues</li>
          <li>Security concerns addressed promptly</li>
        </ul>
        <h3>Business Hours:</h3>
        <p>Our support team operates Monday-Friday, 9 AM - 5 PM EST. Messages received outside these hours will be addressed on the next business day.</p>
      `,
      tags: ['response time', 'support', 'timing', 'business hours'],
      readTime: '2 min read'
    },
    {
      id: 48,
      category: 'Contact Support',
      title: 'Help Center search functionality',
      description: 'Finding articles quickly',
      content: `
        <h2>Search the Help Center</h2>
        <p>Quickly find the help you need with our search feature:</p>
        <h3>How to Search:</h3>
        <ol>
          <li>Type keywords in the search bar at the top</li>
          <li>See live results as you type</li>
          <li>Click on any result to read the full article</li>
        </ol>
        <h3>Search Tips:</h3>
        <ul>
          <li>Use specific keywords</li>
          <li>Try category names (e.g., "Account Management")</li>
          <li>Search by feature names</li>
          <li>Check article titles and descriptions</li>
        </ul>
        <h3>Features:</h3>
        <ul>
          <li>Real-time results dropdown</li>
          <li>Category badges for easy identification</li>
          <li>Read time estimates</li>
        </ul>
        <h3>Clear Search:</h3>
        <p>Click the X icon to clear your search and start over.</p>
      `,
      tags: ['help center', 'search', 'find', 'articles', 'features'],
      readTime: '3 min read'
    },
    {
      id: 49,
      category: 'Contact Support',
      title: 'About page information',
      description: 'Learn about Zyndex',
      content: `
        <h2>About Zyndex</h2>
        <p>Learn more about our platform and mission:</p>
        <h3>About Page Includes:</h3>
        <ul>
          <li>Platform mission and vision</li>
          <li>Team information</li>
          <li>Educational philosophy</li>
          <li>Contact details</li>
        </ul>
        <h3>How to Access:</h3>
        <ol>
          <li>Navigate to About section</li>
          <li>Browse from the main menu</li>
          <li>Available on public pages</li>
        </ol>
      `,
      tags: ['about', 'information', 'mission', 'team', 'platform'],
      readTime: '2 min read'
    },
    {
      id: 50,
      category: 'Contact Support',
      title: 'Rating help articles',
      description: 'Provide feedback on article helpfulness',
      content: `
        <h2>Article Feedback</h2>
        <p>After reading a help article, you can rate its helpfulness:</p>
        <h3>How to Rate:</h3>
        <ol>
          <li>Read the article content</li>
          <li>Scroll to the bottom</li>
          <li>Click "Yes" if the article was helpful</li>
          <li>Click "No" if it wasn't helpful</li>
          <li>See a thank you message</li>
        </ol>
        <h3>Why Rate Articles:</h3>
        <ul>
          <li>Help us improve documentation</li>
          <li>Identify articles that need updates</li>
          <li>Guide future content creation</li>
        </ul>
      `,
      tags: ['rating', 'feedback', 'articles', 'helpful', 'improve'],
      readTime: '2 min read'
    },

    // Subscription, Plans & Billing (New refined platform articles)
    {
      id: 101,
      category: 'Account & Profile',
      title: 'Upgrading your plan with UPI QR & UTR verification',
      description: 'How to upgrade to Scholar or Institutional tier using UPI QR code and UTR',
      content: `
        <h2>Upgrading Your Zyndex Plan</h2>
        <p>Zyndex offers premium tiers (Scholar Pro & Institutional Unlimited) with expanded offline downloads, unlimited reading time, and research tools.</p>
        <h3>How UPI Payment Works:</h3>
        <ol>
          <li>Navigate to your User Dashboard and click on <strong>Upgrade Plan</strong> or visit your Profile subscription tab.</li>
          <li>Select your desired tier (Monthly or Annual pass).</li>
          <li>Scan the displayed dynamic UPI QR Code using any UPI application (Google Pay, PhonePe, Paytm, BHIM, or banking app) presented in the secure checkout interface.</li>
          <li>Complete payment and copy the 12-digit <strong>UTR / Bank Reference Number</strong> from your payment receipt.</li>
          <li>Enter the 12-digit UTR into the verification box on Zyndex and click <strong>Submit Verification</strong>.</li>
          <li>Our backend verifies the reference and upgrades your account tier immediately. An automated HTML invoice receipt is dispatched to your email.</li>
        </ol>
      `,
      tags: ['plan', 'upgrade', 'upi', 'utr', 'payment', 'scholar', 'billing'],
      readTime: '4 min read'
    },
    {
      id: 102,
      category: 'Account & Profile',
      title: 'Zero auto-debit policy and transparent billing',
      description: 'Understanding Zyndex non-recurring fixed passes and renewal policy',
      content: `
        <h2>Zero Auto-Debit Guarantee</h2>
        <p>At Zyndex, we believe in 100% financial transparency. We <strong>never</strong> store your credit or debit card numbers, and we never set up recurring auto-debits without explicit action.</p>
        <h3>Key Principles:</h3>
        <ul>
          <li><strong>No Surprise Recurring Charges:</strong> All plan upgrades are one-time prepaid period passes. You are never silently charged at the end of a month or year.</li>
          <li><strong>24-Hour Expiry Alert:</strong> Exactly 24 hours prior to pass expiration, Zyndex sends a courteous notification email to your registered inbox.</li>
          <li><strong>Graceful Degradation:</strong> If you choose not to renew, your account simply transitions to the Free Academic Reader tier. Your reading history, bookmarks, notes, and profile settings remain 100% intact.</li>
        </ul>
      `,
      tags: ['auto-debit', 'no recurring', 'billing', 'transparency', 'refund', 'subscription'],
      readTime: '3 min read'
    },
    {
      id: 103,
      category: 'Finding Resources',
      title: 'Understanding active reading telemetry and idle protection',
      description: 'How Zyndex tracks genuine active reading time without inflating durations',
      content: `
        <h2>Accurate Active Reading Telemetry</h2>
        <p>Zyndex provides real-time reading analytics to help scholars monitor their study habits and librarians review library engagement.</p>
        <h3>How Reading Duration is Measured:</h3>
        <ul>
          <li><strong>Active Engagement Only:</strong> Duration only increments while the resource document is actively visible in your browser tab.</li>
          <li><strong>Tab Switching & Background Detection:</strong> Utilizing the HTML5 Page Visibility API, the timer pauses immediately when you switch tabs, minimize the browser, or lock your workstation.</li>
          <li><strong>Tab Close / Session End:</strong> When you close the reader tab or navigate away, the browser sends an asynchronous <code>navigator.sendBeacon</code> payload that finalizes the reading segment cleanly, preventing hung sessions or inflated timestamps.</li>
          <li><strong>Discrete Reader Sessions:</strong> If you read a paper, log out, and log back in later, each session is cataloged as a distinct chronological event in the analytics ledger, guaranteeing pristine precision.</li>
        </ul>
      `,
      tags: ['reading', 'analytics', 'telemetry', 'duration', 'privacy', 'active time', 'logs'],
      readTime: '4 min read'
    },
  ];

  // Merge all help articles (base 50 + additional 30 + additional 20 = 100 articles)
  const helpArticles = [...baseHelpArticles, ...additionalHelpArticles, ...additionalHelpArticles2];

  // Get unique categories and count articles
  const categoryStats = useMemo(() => {
    const stats = {};
    helpArticles.forEach(article => {
      if (!stats[article.category]) {
        stats[article.category] = {
          count: 0,
          articles: []
        };
      }
      stats[article.category].count++;
      stats[article.category].articles.push(article);
    });
    return stats;
  }, [helpArticles]);

  const categories = Object.keys(categoryStats).sort();

  // Live search filtering
  const filteredArticles = useMemo(() => {
    if (!searchQuery.trim()) return [];

    const query = searchQuery.toLowerCase().trim();
    
    return helpArticles.filter(article => {
      const titleMatch = article.title.toLowerCase().includes(query);
      const descriptionMatch = article.description.toLowerCase().includes(query);
      const categoryMatch = article.category.toLowerCase().includes(query);
      const tagsMatch = article.tags.some(tag => tag.toLowerCase().includes(query));
      
      return titleMatch || descriptionMatch || categoryMatch || tagsMatch;
    });
  }, [searchQuery, helpArticles]);

  // Category-based filtering
  const displayArticles = useMemo(() => {
    if (selectedCategoryFilter === 'all') {
      return helpArticles;
    }
    return helpArticles.filter(article => article.category === selectedCategoryFilter);
  }, [selectedCategoryFilter, helpArticles]);

  const openArticle = (article) => {
    setSelectedArticle(article);
    setSearchQuery('');
  };

  const closeArticle = () => {
    setSelectedArticle(null);
  };

  const toggleCategory = (category) => {
    if (expandedCategory === category) {
      setExpandedCategory(null);
    } else {
      setExpandedCategory(category);
    }
  };

  const handleFeedback = (articleId, helpful) => {
    setArticleFeedback(prev => ({
      ...prev,
      [articleId]: helpful
    }));
  };

  const quickLinks = [
    { icon: HelpCircle, text: 'Frequently Asked Questions', link: '/Zyndex/Support/Frequently-Asked-Questions' },
    { icon: MessageSquare, text: 'Contact Support', link: '/Zyndex/About/Contact' },
  ];

  return (
    <PublicLayout>
      <div className="min-h-screen relative overflow-hidden">
        {/* Professional Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-gray-50 via-white to-orange-50/40 pointer-events-none"></div>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-orange-100/10 via-transparent to-transparent pointer-events-none"></div>
        
        <div className="relative py-20 px-4">
          <div className="max-w-7xl mx-auto">
          
          {/* Article Detail View */}
          <AnimatePresence>
            {selectedArticle && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 overflow-y-auto"
                onClick={closeArticle}
              >
                <motion.div
                  initial={{ opacity: 0, y: 50, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 50, scale: 0.95 }}
                  transition={{ type: 'spring', damping: 25 }}
                  className="min-h-screen py-8 flex items-start justify-center"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="bg-white rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.3)] max-w-4xl w-full mx-4 overflow-hidden border border-gray-200"
                    style={{
                      boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), inset 0 -1px 0 0 rgba(255,255,255,0.6), 0 1px 2px 0 rgba(0,0,0,0.05)'
                    }}>
                    {/* Article Header with Apple-style design */}
                    <div className="bg-gradient-to-br from-orange-500 to-amber-600 text-white p-8 relative overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent"></div>
                      <button
                        onClick={closeArticle}
                        className="absolute top-6 right-6 p-2 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-xl transition-all duration-300 group z-20"
                      >
                        <X className="size-5 group-hover:rotate-90 transition-transform duration-300" />
                      </button>
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="relative z-10"
                      >
                        <span className="inline-block px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-sm font-medium mb-4">
                          {selectedArticle.category}
                        </span>
                        <h2 className="text-3xl font-bold mb-3">{selectedArticle.title}</h2>
                        <p className="text-orange-100 text-lg">{selectedArticle.description}</p>
                        <div className="flex items-center gap-4 mt-4 text-orange-100">
                          <div className="flex items-center gap-1">
                            <Clock className="size-4" />
                            <span className="text-sm">{selectedArticle.readTime}</span>
                          </div>
                        </div>
                      </motion.div>
                    </div>

                    {/* Article Content */}
                    <div className="p-8 bg-white">
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.2 }}
                        className="article-content prose prose-orange max-w-none"
                        dangerouslySetInnerHTML={{ __html: selectedArticle.content }}
                      />

                      {/* Feedback Section */}
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="mt-12 pt-8 border-t border-gray-200"
                      >
                        <p className="text-gray-700 font-medium mb-4">Was this article helpful?</p>
                        <div className="flex gap-3">
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => handleFeedback(selectedArticle.id, true)}
                            className={`flex items-center gap-2 px-6 py-3 rounded-xl border-2 transition-all duration-300 ${
                              articleFeedback[selectedArticle.id] === true
                                ? 'bg-green-500 text-white border-green-500 shadow-lg shadow-green-500/30'
                                : 'bg-white text-gray-700 border-gray-300 hover:border-green-500 hover:bg-green-50'
                            }`}
                            style={{
                              boxShadow: articleFeedback[selectedArticle.id] === true 
                                ? '0 10px 25px -5px rgba(34, 197, 94, 0.3), inset 0 -2px 0 0 rgba(0,0,0,0.1)'
                                : '0 4px 6px -1px rgba(0,0,0,0.1), inset 0 -1px 0 0 rgba(0,0,0,0.05)'
                            }}
                          >
                            <ThumbsUp className="size-5" />
                            Yes
                          </motion.button>
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => handleFeedback(selectedArticle.id, false)}
                            className={`flex items-center gap-2 px-6 py-3 rounded-xl border-2 transition-all duration-300 ${
                              articleFeedback[selectedArticle.id] === false
                                ? 'bg-red-500 text-white border-red-500 shadow-lg shadow-red-500/30'
                                : 'bg-white text-gray-700 border-gray-300 hover:border-red-500 hover:bg-red-50'
                            }`}
                            style={{
                              boxShadow: articleFeedback[selectedArticle.id] === false 
                                ? '0 10px 25px -5px rgba(239, 68, 68, 0.3), inset 0 -2px 0 0 rgba(0,0,0,0.1)'
                                : '0 4px 6px -1px rgba(0,0,0,0.1), inset 0 -1px 0 0 rgba(0,0,0,0.05)'
                            }}
                          >
                            <ThumbsDown className="size-5" />
                            No
                          </motion.button>
                        </div>
                        {articleFeedback[selectedArticle.id] !== undefined && (
                          <motion.p
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="mt-4 text-sm text-gray-600"
                          >
                            Thank you for your feedback! 🙏
                          </motion.p>
                        )}
                      </motion.div>
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Main Help Center Content */}
          {!selectedArticle && (
            <>
              {/* Header */}
              <div className="text-center mb-12">
                <motion.div
                  className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-100 to-amber-100 rounded-full mb-6"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5, delay: 0.1 }}
                  style={{
                    boxShadow: '0 2px 8px -2px rgba(249, 115, 22, 0.3)'
                  }}
                >
                  <HelpCircle className="size-5 text-orange-600" />
                  <span className="text-sm font-semibold text-orange-700">Knowledge Base</span>
                </motion.div>
                <motion.h1 
                  className="text-5xl md:text-6xl font-bold text-gray-900 mb-6"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                >
                  How can we help you?
                </motion.h1>
                <motion.p 
                  className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto leading-relaxed"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.5, delay: 0.3 }}
                >
                  Search our comprehensive help documentation or browse by category to find answers to your questions
                </motion.p>
              </div>
              
              {/* Search Bar with Live Results */}
              <motion.div 
                className="max-w-3xl mx-auto relative mb-16"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: 0.4 }}
              >
                <div className="relative">
                  <Search className="absolute left-6 top-1/2 -translate-y-1/2 size-6 text-orange-500" />
                  <input
                    type="text"
                    placeholder="Type your question or search keywords..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-16 pr-16 py-5 text-lg border-2 border-gray-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-orange-500/20 focus:border-orange-400 bg-white transition-all"
                    style={{
                      boxShadow: '0 8px 16px -4px rgba(0,0,0,0.1), inset 0 -2px 0 0 rgba(0,0,0,0.05)'
                    }}
                  />
                  {searchQuery && (
                    <motion.button
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      onClick={() => setSearchQuery('')}
                      className="absolute right-4 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 rounded-full transition-colors"
                    >
                      <X className="size-4 text-gray-400" />
                    </motion.button>
                  )}
                </div>

                {/* Live Search Results Dropdown */}
                <AnimatePresence>
                  {searchQuery && (
                    <motion.div
                      initial={{ opacity: 0, y: -10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -10, scale: 0.95 }}
                      transition={{ duration: 0.2 }}
                      className="absolute top-full mt-3 w-full bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden z-50 max-h-[500px] overflow-y-auto"
                      style={{
                        boxShadow: '0 20px 40px -10px rgba(0,0,0,0.15), 0 10px 15px -5px rgba(0,0,0,0.08)'
                      }}
                    >
                      {filteredArticles.length > 0 ? (
                        <>
                          <div className="p-4 bg-gradient-to-r from-gray-50 to-white border-b border-gray-200">
                            <p className="text-sm font-semibold text-gray-900">
                              Search Results
                            </p>
                            <p className="text-xs text-gray-600 mt-0.5">
                              Found {filteredArticles.length} {filteredArticles.length === 1 ? 'article' : 'articles'}
                            </p>
                          </div>
                          <div className="divide-y divide-gray-100">
                            {filteredArticles.map((article, index) => (
                              <motion.div
                                key={article.id}
                                initial={{ opacity: 0, y: 5 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.03 }}
                                onClick={() => openArticle(article)}
                                className="p-4 hover:bg-gradient-to-r hover:from-orange-50/70 hover:to-transparent cursor-pointer transition-all duration-200 group"
                              >
                                <div className="flex items-start gap-4">
                                  <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-amber-600 rounded-lg flex items-center justify-center text-white font-bold text-xs flex-shrink-0 shadow-md"
                                    style={{
                                      boxShadow: '0 2px 4px -1px rgba(249, 115, 22, 0.4), inset 0 -1px 0 0 rgba(0,0,0,0.1)'
                                    }}>
                                    {article.id}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <h4 className="font-semibold text-gray-900 group-hover:text-orange-600 transition-colors">
                                      {article.title}
                                    </h4>
                                    <p className="text-sm text-gray-600 mt-1 line-clamp-1">
                                      {article.description}
                                    </p>
                                    <div className="flex items-center gap-3 mt-2">
                                      <span className="inline-block text-xs text-orange-700 font-medium px-2.5 py-0.5 bg-gradient-to-r from-orange-100 to-amber-100 rounded-md">
                                        {article.category}
                                      </span>
                                      <span className="text-xs text-gray-500">{article.readTime}</span>
                                    </div>
                                  </div>
                                  <ChevronRight className="size-4 text-gray-300 group-hover:text-orange-500 flex-shrink-0 mt-0.5 transition-colors group-hover:translate-x-0.5" />
                                </div>
                              </motion.div>
                            ))}
                          </div>
                        </>
                      ) : (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="p-8 text-center"
                        >
                          <HelpCircle className="size-12 text-gray-400 mx-auto mb-3" />
                          <p className="text-gray-600 font-medium">No articles found</p>
                          <p className="text-sm text-gray-500 mt-1">Try different keywords or browse categories below</p>
                        </motion.div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>

              {/* View Mode Selector */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="flex items-center justify-between mb-8 flex-wrap gap-4"
              >
                <div className="flex gap-2 flex-wrap">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setViewMode('toc')}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium transition-all duration-300 ${
                      viewMode === 'toc'
                        ? 'bg-gradient-to-r from-orange-500 to-amber-600 text-white shadow-lg shadow-orange-500/30'
                        : 'bg-white text-gray-700 border border-gray-300 hover:border-orange-400 hover:bg-orange-50'
                    }`}
                    style={{
                      boxShadow: viewMode === 'toc'
                        ? '0 4px 12px -2px rgba(249, 115, 22, 0.4), inset 0 -2px 0 0 rgba(0,0,0,0.1)'
                        : '0 1px 3px 0 rgba(0,0,0,0.1), inset 0 -1px 0 0 rgba(0,0,0,0.05)'
                    }}
                  >
                    <List className="size-4" />
                    All Topics
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setViewMode('category')}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium transition-all duration-300 ${
                      viewMode === 'category'
                        ? 'bg-gradient-to-r from-orange-500 to-amber-600 text-white shadow-lg shadow-orange-500/30'
                        : 'bg-white text-gray-700 border border-gray-300 hover:border-orange-400 hover:bg-orange-50'
                    }`}
                    style={{
                      boxShadow: viewMode === 'category'
                        ? '0 4px 12px -2px rgba(249, 115, 22, 0.4), inset 0 -2px 0 0 rgba(0,0,0,0.1)'
                        : '0 1px 3px 0 rgba(0,0,0,0.1), inset 0 -1px 0 0 rgba(0,0,0,0.05)'
                    }}
                  >
                    <Layers className="size-4" />
                    Categories
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setViewMode('grid')}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium transition-all duration-300 ${
                      viewMode === 'grid'
                        ? 'bg-gradient-to-r from-orange-500 to-amber-600 text-white shadow-lg shadow-orange-500/30'
                        : 'bg-white text-gray-700 border border-gray-300 hover:border-orange-400 hover:bg-orange-50'
                    }`}
                    style={{
                      boxShadow: viewMode === 'grid'
                        ? '0 4px 12px -2px rgba(249, 115, 22, 0.4), inset 0 -2px 0 0 rgba(0,0,0,0.1)'
                        : '0 1px 3px 0 rgba(0,0,0,0.1), inset 0 -1px 0 0 rgba(0,0,0,0.05)'
                    }}
                  >
                    <Grid3x3 className="size-4" />
                    Grid
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setViewMode('all')}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium transition-all duration-300 ${
                      viewMode === 'all'
                        ? 'bg-gradient-to-r from-orange-500 to-amber-600 text-white shadow-lg shadow-orange-500/30'
                        : 'bg-white text-gray-700 border border-gray-300 hover:border-orange-400 hover:bg-orange-50'
                    }`}
                    style={{
                      boxShadow: viewMode === 'all'
                        ? '0 4px 12px -2px rgba(249, 115, 22, 0.4), inset 0 -2px 0 0 rgba(0,0,0,0.1)'
                        : '0 1px 3px 0 rgba(0,0,0,0.1), inset 0 -1px 0 0 rgba(0,0,0,0.05)'
                    }}
                  >
                    <FileText className="size-4" />
                    Detailed
                  </motion.button>
                </div>

                {(viewMode === 'grid' || viewMode === 'all') && (
                  <motion.select
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    value={selectedCategoryFilter}
                    onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                    className="px-4 py-2 bg-white border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all cursor-pointer"
                    style={{
                      boxShadow: '0 2px 4px -1px rgba(0,0,0,0.06), inset 0 -1px 0 0 rgba(0,0,0,0.05)'
                    }}
                  >
                    <option value="all">All Categories</option>
                    {categories.map(category => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </motion.select>
                )}
              </motion.div>

              {/* Table of Contents View - All Articles */}
              {viewMode === 'toc' && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="space-y-6"
                >
                  {/* Clean Header */}
                  <div className="text-center mb-8">
                    <h2 className="text-3xl font-bold text-gray-900 mb-3">Browse All Topics</h2>
                    <p className="text-gray-600 text-lg">Comprehensive guides organized by category</p>
                  </div>

                  {/* Organized by category with all articles numbered */}
                  {categories.map((category, categoryIndex) => (
                    <motion.div
                      key={category}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: categoryIndex * 0.05 }}
                      className="bg-white rounded-2xl border-2 border-gray-200 overflow-hidden"
                      style={{
                        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1), inset 0 -1px 0 0 rgba(255,255,255,0.8), 0 1px 2px 0 rgba(0,0,0,0.05)'
                      }}
                    >
                      <div className="px-6 py-5 bg-gradient-to-r from-gray-50 to-white border-b-2 border-gray-200">
                        <div className="flex items-center gap-4">
                          <div className="p-3 bg-gradient-to-br from-orange-500 to-amber-600 rounded-xl shadow-md"
                            style={{
                              boxShadow: '0 4px 6px -1px rgba(249, 115, 22, 0.3), inset 0 -1px 0 0 rgba(0,0,0,0.1)'
                            }}>
                            <BookOpen className="size-6 text-white" />
                          </div>
                          <div>
                            <h3 className="text-2xl font-bold text-gray-900">{category}</h3>
                            <p className="text-sm text-gray-500 mt-1">
                              Essential guides and documentation
                            </p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {categoryStats[category].articles.map((article, index) => (
                          <motion.button
                            key={article.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.02 }}
                            onClick={() => openArticle(article)}
                            className="flex items-start gap-3 p-4 bg-white border border-gray-200 rounded-xl hover:border-orange-400 hover:shadow-xl transition-all duration-300 group text-left"
                            style={{
                              boxShadow: '0 2px 4px 0 rgba(0,0,0,0.06), inset 0 -1px 0 0 rgba(255,255,255,0.8)'
                            }}
                          >
                            <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-orange-500 to-amber-600 rounded-lg flex items-center justify-center text-white font-bold text-sm shadow-md"
                              style={{
                                boxShadow: '0 2px 4px -1px rgba(249, 115, 22, 0.4), inset 0 -1px 0 0 rgba(0,0,0,0.1)'
                              }}>
                              {article.id}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-semibold text-sm text-gray-900 group-hover:text-orange-600 transition-colors line-clamp-2 leading-snug">
                                {article.title}
                              </h4>
                              <p className="text-xs text-gray-500 mt-1.5">{article.readTime}</p>
                            </div>
                            <ChevronRight className="size-4 text-gray-300 group-hover:text-orange-500 group-hover:translate-x-1 transition-all flex-shrink-0 mt-0.5" />
                          </motion.button>
                        ))}
                      </div>
                    </motion.div>
                  ))}


                </motion.div>
              )}

              {/* Category View */}
              {viewMode === 'category' && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="space-y-4"
                >
                  {categories.map((category, categoryIndex) => (
                    <motion.div
                      key={category}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: categoryIndex * 0.05 }}
                      className="bg-white rounded-2xl border-2 border-gray-200 overflow-hidden"
                      style={{
                        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1), inset 0 -1px 0 0 rgba(255,255,255,0.8), 0 1px 2px 0 rgba(0,0,0,0.05)'
                      }}
                    >
                      <button
                        onClick={() => toggleCategory(category)}
                        className="w-full px-6 py-5 flex items-center justify-between bg-gradient-to-r from-orange-50 to-amber-50 hover:from-orange-100 hover:to-amber-100 transition-all duration-300 group"
                      >
                        <div className="flex items-center gap-4">
                          <div className="p-3 bg-gradient-to-br from-orange-500 to-amber-600 rounded-xl shadow-lg group-hover:scale-110 transition-transform duration-300"
                            style={{
                              boxShadow: '0 10px 25px -5px rgba(249, 115, 22, 0.3), inset 0 -2px 0 0 rgba(0,0,0,0.1)'
                            }}>
                            <BookOpen className="size-6 text-white" />
                          </div>
                          <div className="text-left">
                            <h3 className="text-xl font-bold text-gray-900">{category}</h3>
                            <p className="text-sm text-gray-600">Explore helpful guides</p>
                          </div>
                        </div>
                        <motion.div
                          animate={{ rotate: expandedCategory === category ? 180 : 0 }}
                          transition={{ duration: 0.3 }}
                        >
                          <ChevronDown className="size-6 text-gray-400 group-hover:text-orange-600 transition-colors" />
                        </motion.div>
                      </button>

                      <AnimatePresence>
                        {expandedCategory === category && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.3 }}
                            className="overflow-hidden"
                          >
                            <div className="p-6 bg-white grid grid-cols-1 md:grid-cols-2 gap-4">
                              {categoryStats[category].articles.map((article, index) => (
                                <motion.div
                                  key={article.id}
                                  initial={{ opacity: 0, x: -20 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ delay: index * 0.05 }}
                                  onClick={() => openArticle(article)}
                                  className="p-4 bg-gradient-to-br from-gray-50 to-white border-2 border-gray-200 rounded-xl hover:border-orange-300 hover:shadow-lg cursor-pointer transition-all duration-300 group"
                                  style={{
                                    boxShadow: '0 2px 4px -1px rgba(0,0,0,0.06), inset 0 -1px 0 0 rgba(255,255,255,0.8)'
                                  }}
                                >
                                  <div className="flex items-start gap-3">
                                    <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-orange-500 to-amber-600 rounded-lg flex items-center justify-center text-white font-bold text-sm shadow-md"
                                      style={{
                                        boxShadow: '0 4px 6px -1px rgba(249, 115, 22, 0.3), inset 0 -1px 0 0 rgba(0,0,0,0.1)'
                                      }}>
                                      {article.id}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <h4 className="font-semibold text-gray-900 group-hover:text-orange-600 transition-colors line-clamp-2 mb-1">
                                        {article.title}
                                      </h4>
                                      <p className="text-sm text-gray-600 line-clamp-2 mb-2">
                                        {article.description}
                                      </p>
                                      <div className="flex items-center gap-2 text-xs text-gray-500">
                                        <Clock className="size-3" />
                                        <span>{article.readTime}</span>
                                      </div>
                                    </div>
                                    <ChevronRight className="size-5 text-gray-400 group-hover:text-orange-600 group-hover:translate-x-1 transition-all flex-shrink-0" />
                                  </div>
                                </motion.div>
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  ))}
                </motion.div>
              )}

              {/* Grid View */}
              {viewMode === 'grid' && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5"
                >
                  {displayArticles.map((article, index) => (
                    <motion.div
                      key={article.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.02 }}
                      onClick={() => openArticle(article)}
                      className="bg-white p-6 rounded-2xl border border-gray-200 hover:border-orange-400 hover:shadow-2xl cursor-pointer transition-all duration-300 group"
                      style={{
                        boxShadow: '0 2px 8px 0 rgba(0,0,0,0.06), inset 0 -1px 0 0 rgba(255,255,255,0.8)'
                      }}
                    >
                      <div className="flex items-start justify-between mb-4">
                        <span className="inline-block px-3 py-1.5 bg-gradient-to-r from-orange-100 to-amber-100 text-orange-700 rounded-lg text-xs font-semibold">
                          {article.category}
                        </span>
                        <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-amber-600 rounded-lg flex items-center justify-center text-white font-bold text-xs shadow-md"
                          style={{
                            boxShadow: '0 2px 4px -1px rgba(249, 115, 22, 0.4), inset 0 -1px 0 0 rgba(0,0,0,0.1)'
                          }}>
                          {article.id}
                        </div>
                      </div>
                      <h3 className="font-bold text-lg text-gray-900 group-hover:text-orange-600 transition-colors mb-3 line-clamp-2 leading-snug">
                        {article.title}
                      </h3>
                      <p className="text-sm text-gray-600 mb-4 line-clamp-2 leading-relaxed">
                        {article.description}
                      </p>
                      <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                        <div className="flex items-center gap-1.5 text-xs text-gray-500">
                          <Clock className="size-3.5" />
                          <span>{article.readTime}</span>
                        </div>
                        <ChevronRight className="size-4 text-gray-300 group-hover:text-orange-500 group-hover:translate-x-1 transition-all" />
                      </div>
                    </motion.div>
                  ))}
                </motion.div>
              )}

              {/* All Articles List View */}
              {viewMode === 'all' && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="bg-white rounded-2xl border border-gray-200 overflow-hidden"
                  style={{
                    boxShadow: '0 4px 12px 0 rgba(0,0,0,0.08), inset 0 -1px 0 0 rgba(255,255,255,0.8)'
                  }}
                >
                  <div className="p-6 bg-gradient-to-r from-gray-50 to-white border-b border-gray-200">
                    <h2 className="text-2xl font-bold text-gray-900">
                      {selectedCategoryFilter === 'all' ? 'All Articles' : selectedCategoryFilter}
                    </h2>
                    <p className="text-sm text-gray-600 mt-1">Explore comprehensive guides and documentation</p>
                  </div>
                  <div className="divide-y divide-gray-100">
                    {displayArticles.map((article, index) => (
                      <motion.div
                        key={article.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.02 }}
                        onClick={() => openArticle(article)}
                        className="p-6 hover:bg-gradient-to-r hover:from-orange-50/50 hover:to-transparent cursor-pointer transition-all duration-300 group"
                      >
                        <div className="flex items-start gap-5">
                          <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-orange-500 to-amber-600 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-md"
                            style={{
                              boxShadow: '0 2px 4px -1px rgba(249, 115, 22, 0.4), inset 0 -1px 0 0 rgba(0,0,0,0.1)'
                            }}>
                            {article.id}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 mb-2">
                              <span className="inline-block px-3 py-1 bg-gradient-to-r from-orange-100 to-amber-100 text-orange-700 rounded-lg text-xs font-semibold">
                                {article.category}
                              </span>
                              <span className="flex items-center gap-1 text-xs text-gray-500">
                                <Clock className="size-3" />
                                {article.readTime}
                              </span>
                            </div>
                            <h3 className="font-bold text-lg text-gray-900 group-hover:text-orange-600 transition-colors mb-2">
                              {article.title}
                            </h3>
                            <p className="text-sm text-gray-600 line-clamp-2 leading-relaxed">
                              {article.description}
                            </p>
                          </div>
                          <ChevronRight className="size-6 text-gray-400 group-hover:text-orange-600 group-hover:translate-x-1 transition-all flex-shrink-0 mt-2" />
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Quick Links */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="mt-16"
              >
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Need More Help?</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {quickLinks.map((link, index) => (
                    <motion.a
                      key={index}
                      href={link.link}
                      whileHover={{ scale: 1.02, y: -2 }}
                      whileTap={{ scale: 0.98 }}
                      className="flex items-center gap-4 p-6 bg-white border-2 border-gray-200 hover:border-orange-300 rounded-2xl hover:shadow-lg transition-all duration-300 group"
                      style={{
                        boxShadow: '0 2px 4px -1px rgba(0,0,0,0.06), inset 0 -1px 0 0 rgba(255,255,255,0.8)'
                      }}
                    >
                      <div className="p-3 bg-gradient-to-br from-orange-500 to-amber-600 rounded-xl shadow-md group-hover:scale-110 transition-transform duration-300"
                        style={{
                          boxShadow: '0 4px 6px -1px rgba(249, 115, 22, 0.3), inset 0 -1px 0 0 rgba(0,0,0,0.1)'
                        }}>
                        <link.icon className="size-6 text-white" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 group-hover:text-orange-600 transition-colors">
                          {link.text}
                        </h3>
                      </div>
                      <ChevronRight className="size-5 text-gray-400 group-hover:text-orange-600 group-hover:translate-x-1 transition-all" />
                    </motion.a>
                  ))}
                </div>
              </motion.div>
            </>
          )}
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}
