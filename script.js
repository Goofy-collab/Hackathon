//  <!-- Firebase Configuration and Integration -->
    
        // // Firebase configuration
        // const firebaseConfig = {
        //     apiKey: "AIzaSyDmV5M9IvedoODV1rWE6WZy6d-icOXcWGQ",
        //     authDomain: "edu-bridge-ai.firebaseapp.com",
        //     databaseURL: "https://edu-bridge-ai-default-rtdb.firebaseio.com",
        //     projectId: "edu-bridge-ai",
        //     storageBucket: "edu-bridge-ai.firebasestorage.app",
        //     messagingSenderId: "632925487014",
        //     appId: "1:632925487014:web:64816784c57e693ba21967",
        //     measurementId: "G-8DWD84TJ4L"
        // };

        // // Initialize Firebase
        // const app = firebase.initializeApp(firebaseConfig);
        // const auth = firebase.auth();
        // const db = firebase.firestore();
        // const analytics = firebase.analytics();
        // const rtdb = firebase.database();

        // // Authentication state observer
        // auth.onAuthStateChanged((user) => {
        //     if (user) {
        //         console.log("User signed in:", user.email);
        //         showUserProfile(user);
        //         loadUserData(user.uid);
        //     } else {
        //         console.log("User signed out");
        //         showAuthButtons();
        //     }
        // });

        // Show user profile when logged in
        function showUserProfile(user) {
            const loginBtn = document.getElementById('loginBtn');
            const signupBtn = document.getElementById('signupBtn');
            const userProfile = document.getElementById('userProfile');
            const username = document.getElementById('username');
            
            if (loginBtn) loginBtn.style.display = 'none';
            if (signupBtn) signupBtn.style.display = 'none';
            if (userProfile) {
                userProfile.classList.remove('hidden');
                if (username) username.textContent = user.displayName || user.email.split('@')[0];
            }
        }

        // Show auth buttons when logged out
        function showAuthButtons() {
            const loginBtn = document.getElementById('loginBtn');
            const signupBtn = document.getElementById('signupBtn');
            const userProfile = document.getElementById('userProfile');
            
            if (loginBtn) loginBtn.style.display = 'block';
            if (signupBtn) signupBtn.style.display = 'block';
            if (userProfile) userProfile.classList.add('hidden');
        }

        // Sign up function
        async function signUpUser(email, password, name, country, userType) {
            try {
                const userCredential = await auth.createUserWithEmailAndPassword(email, password);
                const user = userCredential.user;
                
                await user.updateProfile({
                    displayName: name
                });
                
                await db.collection('users').doc(user.uid).set({
                    name: name,
                    email: email,
                    country: country,
                    userType: userType,
                    subscriptionPlan: 'free',
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    lastActive: firebase.firestore.FieldValue.serverTimestamp()
                });
                
                showNotification('Account created successfully! Welcome to EduBridge Africa.', 'success');
                closeModal('signupModal');
                
                return user;
            } catch (error) {
                console.error('Sign up error:', error);
                showNotification('Error creating account: ' + error.message, 'error');
                throw error;
            }
        }

        // Sign in function
        async function signInUser(email, password) {
            try {
                const userCredential = await auth.signInWithEmailAndPassword(email, password);
                const user = userCredential.user;
                
                await db.collection('users').doc(user.uid).update({
                    lastActive: firebase.firestore.FieldValue.serverTimestamp()
                });
                
                showNotification('Welcome back to EduBridge Africa!', 'success');
                closeModal('loginModal');
                
                return user;
            } catch (error) {
                console.error('Sign in error:', error);
                showNotification('Error signing in: ' + error.message, 'error');
                throw error;
            }
        }

        // Sign out function
        async function signOutUser() {
            try {
                await auth.signOut();
                showNotification('Signed out successfully', 'success');
                window.location.reload();
            } catch (error) {
                console.error('Sign out error:', error);
                showNotification('Error signing out', 'error');
            }
        }

        // Load user data from Firestore
        async function loadUserData(userId) {
            try {
                const userDoc = await db.collection('users').doc(userId).get();
                if (userDoc.exists) {
                    const userData = userDoc.data();
                    updateSubscriptionStatus(userData.subscriptionPlan);
                    loadUserLearningPaths(userId);
                    
                    analytics.logEvent('user_engagement', {
                        engagement_time_msec: 1000
                    });
                }
            } catch (error) {
                console.error('Error loading user data:', error);
            }
        }

        // Update subscription status in UI
        function updateSubscriptionStatus(plan) {
            const subscriptionBadge = document.getElementById('subscriptionBadge');
            if (subscriptionBadge) {
                if (plan && plan !== 'free') {
                    subscriptionBadge.textContent = plan.charAt(0).toUpperCase() + plan.slice(1);
                    subscriptionBadge.classList.remove('hidden');
                } else {
                    subscriptionBadge.classList.add('hidden');
                }
            }
        }

        // Save learning progress
        async function saveLearningProgress(userId, courseId, progress) {
            try {
                await db.collection('userProgress').doc(`${userId}_${courseId}`).set({
                    userId: userId,
                    courseId: courseId,
                    progress: progress,
                    lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
                }, { merge: true });
            } catch (error) {
                console.error('Error saving progress:', error);
            }
        }

        // Save personalization preferences
        async function savePersonalizationData(userId, preferences) {
            try {
                await db.collection('users').doc(userId).update({
                    learningPreferences: preferences,
                    personalizationCompleted: true,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
                
                showNotification('Learning preferences saved!', 'success');
            } catch (error) {
                console.error('Error saving preferences:', error);
                showNotification('Error saving preferences', 'error');
            }
        }

        // Load user learning paths
        async function loadUserLearningPaths(userId) {
            try {
                const progressQuery = await db.collection('userProgress')
                    .where('userId', '==', userId)
                    .get();
                
                const learningPaths = [];
                progressQuery.forEach((doc) => {
                    learningPaths.push(doc.data());
                });
                
                displayLearningPaths(learningPaths);
            } catch (error) {
                console.error('Error loading learning paths:', error);
            }
        }

        // Handle subscription upgrade
        async function upgradeSubscription(userId, plan, paymentData) {
            try {
                await db.collection('users').doc(userId).update({
                    subscriptionPlan: plan,
                    subscriptionStartDate: firebase.firestore.FieldValue.serverTimestamp(),
                    paymentHistory: firebase.firestore.FieldValue.arrayUnion(paymentData)
                });
                
                analytics.logEvent('purchase', {
                    transaction_id: paymentData.transactionId,
                    value: paymentData.amount,
                    currency: 'USD',
                    items: [{
                        item_id: plan,
                        item_name: `${plan.charAt(0).toUpperCase() + plan.slice(1)} Plan`,
                        price: paymentData.amount,
                        quantity: 1
                    }]
                });
                
                updateSubscriptionStatus(plan);
                showNotification('Subscription upgraded successfully!', 'success');
            } catch (error) {
                console.error('Error upgrading subscription:', error);
                showNotification('Error upgrading subscription', 'error');
            }
        }

        // Utility functions
        function showNotification(message, type = 'info') {
            const notification = document.getElementById('notification');
            const notificationText = document.getElementById('notificationText');
            
            if (notification && notificationText) {
                notificationText.textContent = message;
                notification.className = `notification ${type}`;
                notification.classList.remove('hidden');
                
                setTimeout(() => {
                    notification.classList.add('hidden');
                }, 4000);
            }
        }

        function closeModal(modalId) {
            const modal = document.getElementById(modalId);
            if (modal) {
                modal.classList.add('hidden');
            }
        }

        function displayLearningPaths(paths) {
            const learningPathsContainer = document.getElementById('learningPaths');
            if (learningPathsContainer && paths.length > 0) {
                learningPathsContainer.innerHTML = paths.map(path => `
                    <div class="learning-path-card">
                        <h3>${path.courseId}</h3>
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${path.progress}%"></div>
                        </div>
                        <span>${path.progress}% Complete</span>
                    </div>
                `).join('');
            }
        }

        console.log('Firebase initialized successfully');
    

    // <!-- Main JavaScript File -->
    
        // DOM Content Loaded Event
        document.addEventListener('DOMContentLoaded', function() {
            // Initialize Lucide icons
            if (typeof lucide !== 'undefined') {
                lucide.createIcons();
            }

            // Initialize the chatbot HERE
         window.eduBridgeBot = new EduBridgeChatbot();

            // Login Form Handler
            const loginForm = document.getElementById('loginForm');
            if (loginForm) {
                loginForm.addEventListener('submit', async (e) => {
                    e.preventDefault();
                    const email = document.getElementById('loginEmail').value;
                    const password = document.getElementById('loginPassword').value;
                    
                    showLoadingOverlay();
                    
                    try {
                        await signInUser(email, password);
                    } catch (error) {
                        // Error handling is done in signInUser function
                    } finally {
                        hideLoadingOverlay();
                    }
                });
            }

            // Signup Form Handler
            const signupForm = document.getElementById('signupForm');
            if (signupForm) {
                signupForm.addEventListener('submit', async (e) => {
                    e.preventDefault();
                    const name = document.getElementById('signupName').value;
                    const email = document.getElementById('signupEmail').value;
                    const password = document.getElementById('signupPassword').value;
                    const country = document.getElementById('signupCountry').value;
                    const userType = document.getElementById('userType').value;
                    
                    showLoadingOverlay();
                    
                    try {
                        await signUpUser(email, password, name, country, userType);
                    } catch (error) {
                        // Error handling is done in signUpUser function
                    } finally {
                        hideLoadingOverlay();
                    }
                });
            }

            // Logout Handler
            const logoutBtn = document.getElementById('logoutBtn');
            if (logoutBtn) {
                logoutBtn.addEventListener('click', async (e) => {
                    e.preventDefault();
                    await signOutUser();
                });
            }

            // Personalization Form Handler
            const personalizationForm = document.getElementById('personalizationForm');
            if (personalizationForm) {
                personalizationForm.addEventListener('submit', async (e) => {
                    e.preventDefault();
                    
                    const user = auth.currentUser;
                    if (!user) {
                        showNotification('Please sign in to save your preferences', 'error');
                        return;
                    }
                    
                    const preferences = {
                        subjectInterest: document.getElementById('subjectInterest').value,
                        currentLevel: document.getElementById('currentLevel').value,
                        learningStyle: document.getElementById('learningStyle').value,
                        connectivity: document.getElementById('connectivity').value,
                        learningGoals: document.getElementById('learningGoals').value
                    };
                    
                    showLoadingOverlay();
                    
                    try {
                        await savePersonalizationData(user.uid, preferences);
                        closeModal('personalizationModal');
                        generateLearningPath(preferences);
                    } catch (error) {
                        // Error handled in savePersonalizationData
                    } finally {
                        hideLoadingOverlay();
                    }
                });
            }

            // Payment Form Handler
            const paymentForm = document.getElementById('paymentForm');
            if (paymentForm) {
                paymentForm.addEventListener('submit', async (e) => {
                    e.preventDefault();
                    
                    const user = auth.currentUser;
                    if (!user) {
                        showNotification('Please sign in to upgrade your subscription', 'error');
                        return;
                    }
                    
                    const plan = currentPaymentPlan;
                    const amount = parseFloat(document.getElementById('totalAmount').textContent.replace(', ', ''));
                    
                    showLoadingOverlay();
                    
                    try {
                        const paymentData = {
                            transactionId: 'txn_' + Date.now(),
                            amount: amount,
                            plan: plan,
                            timestamp: new Date().toISOString(),
                            status: 'completed'
                        };
                        
                        await upgradeSubscription(user.uid, plan, paymentData);
                        
                        document.getElementById('successPlanName').textContent = plan.charAt(0).toUpperCase() + plan.slice(1) + ' Plan';
                        document.getElementById('successAmount').textContent = amount.toFixed(2);
                        
                        closeModal('paymentModal');
                        openModal('successModal');
                        
                    } catch (error) {
                        // Error handled in upgradeSubscription
                    } finally {
                        hideLoadingOverlay();
                    }
                });
            }

            // Modal Controls
            document.addEventListener('click', (e) => {
                // Open login modal
                if (e.target.id === 'loginBtn') {
                    openModal('loginModal');
                }
                
                // Open signup modal
                if (e.target.id === 'signupBtn') {
                    openModal('signupModal');
                }
                
                // Switch between login and signup
                if (e.target.id === 'switchToSignup') {
                    e.preventDefault();
                    closeModal('loginModal');
                    openModal('signupModal');
                }
                
                if (e.target.id === 'switchToLogin') {
                    e.preventDefault();
                    closeModal('signupModal');
                    openModal('loginModal');
                }
                
                // Close modals
                if (e.target.classList.contains('close-btn')) {
                    const modalId = e.target.getAttribute('data-modal');
                    closeModal(modalId);
                }
                
                // Close modal when clicking outside
                if (e.target.classList.contains('modal')) {
                    e.target.classList.add('hidden');
                }
                
                // Action buttons
                if (e.target.getAttribute('data-action') === 'personalize') {
                    openModal('personalizationModal');
                }
                
                // Navigation
                if (e.target.classList.contains('nav-link')) {
                    e.preventDefault();
                    const section = e.target.getAttribute('data-section');
                    showSection(section);
                }
                
                // Close notifications
                if (e.target.id === 'closeNotification') {
                    document.getElementById('notification').classList.add('hidden');
                }
            });

            // Plan selection buttons
            document.querySelectorAll('[data-plan]').forEach(button => {
                button.addEventListener('click', (e) => {
                    currentPaymentPlan = e.target.dataset.plan;
                    const price = e.target.dataset.price;
                    
                    document.getElementById('planName').textContent = currentPaymentPlan.charAt(0).toUpperCase() + currentPaymentPlan.slice(1) + ' Plan';
                    document.getElementById('planPrice').textContent = `${price}.00`;
                    document.getElementById('totalAmount').textContent = `${price}.00`;
                    document.getElementById('payButtonAmount').textContent = `${price}.00`;
                    
                    openModal('paymentModal');
                });
            });

            // Navigation function
            function showSection(sectionName) {
                // Hide all sections
                document.querySelectorAll('.section').forEach(section => {
                    section.classList.add('hidden');
                });
                
                // Show selected section
                const targetSection = document.getElementById(sectionName + 'Section');
                if (targetSection) {
                    targetSection.classList.remove('hidden');
                }
                
                // Update active nav link
                document.querySelectorAll('.nav-link').forEach(link => {
                    link.classList.remove('active');
                });
                
                const activeLink = document.querySelector(`[data-section="${sectionName}"]`);
                if (activeLink) {
                    activeLink.classList.add('active');
                }
            }

            // Generate learning path based on preferences
            function generateLearningPath(preferences) {
                const learningPaths = {
                    mathematics: {
                        beginner: ['Basic Arithmetic', 'Introduction to Algebra', 'Geometry Basics'],
                        intermediate: ['Advanced Algebra', 'Trigonometry', 'Statistics'],
                        advanced: ['Calculus', 'Linear Algebra', 'Advanced Statistics']
                    },
                    programming: {
                        beginner: ['Programming Fundamentals', 'HTML/CSS Basics', 'JavaScript Introduction'],
                        intermediate: ['Web Development', 'Python Programming', 'Database Basics'],
                        advanced: ['Advanced JavaScript', 'Full Stack Development', 'Data Structures']
                    },
                    business: {
                        beginner: ['Business Fundamentals', 'Basic Accounting', 'Marketing Basics'],
                        intermediate: ['Business Strategy', 'Financial Management', 'Operations Management'],
                        advanced: ['Advanced Strategy', 'International Business', 'Entrepreneurship']
                    }
                };
                
                const selectedPaths = learningPaths[preferences.subjectInterest]?.[preferences.currentLevel] || [];
                
                const user = auth.currentUser;
                if (user && selectedPaths.length > 0) {
                    selectedPaths.forEach(async (courseName, index) => {
                        await saveLearningProgress(user.uid, `${preferences.subjectInterest}_${index}`, 0);
                    });
                    
                    showNotification(`Created your personalized learning path with ${selectedPaths.length} courses!`, 'success');
                }
            }

            // Utility functions
            function showLoadingOverlay() {
                const overlay = document.getElementById('loadingOverlay');
                if (overlay) overlay.classList.remove('hidden');
            }

            function hideLoadingOverlay() {
                const overlay = document.getElementById('loadingOverlay');
                if (overlay) overlay.classList.add('hidden');
            }

            function openModal(modalId) {
                const modal = document.getElementById(modalId);
                if (modal) modal.classList.remove('hidden');
            }

            // Global variables
            window.currentPaymentPlan = '';
            window.generateLearningPath = generateLearningPath;
            window.showLoadingOverlay = showLoadingOverlay;
            window.hideLoadingOverlay = hideLoadingOverlay;
            window.openModal = openModal;
            window.showSection = showSection;
        });

        




      