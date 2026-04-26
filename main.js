document.addEventListener('DOMContentLoaded', () => {
    console.log('と..ん.て.き.AI部 Gallery Initializing...');

    // Supabase Configuration
    const SUPABASE_URL = 'https://hcdtygcxebqrncgqtqxw.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhjZHR5Z2N4ZWJxcm5jZ3F0cXh3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcxOTcyNDUsImV4cCI6MjA5Mjc3MzI0NX0.6qhWNnQu0xWFCE6xPwUzLpYHsAb9ofaEdZ3Un19wnOE';
    
    if (!window.supabase) {
        console.error('Supabase SDK not found in window object.');
        return;
    }

    const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    let contentData = [];

    // --- State Management for Likes ---
    function getLikedPosts() {
        const likes = localStorage.getItem('tonteki_user_likes');
        return likes ? JSON.parse(likes) : [];
    }

    function saveLike(postId) {
        const likes = getLikedPosts();
        if (!likes.includes(postId)) {
            likes.push(postId);
            localStorage.setItem('tonteki_user_likes', JSON.stringify(likes));
        }
    }

    function isPostLiked(postId) {
        return getLikedPosts().includes(postId);
    }

    const gallery = document.getElementById('gallery');
    const filterBtns = document.querySelectorAll('.filter-btn');
    const uploadModal = document.getElementById('upload-modal');
    const detailModal = document.getElementById('detail-modal');
    const loginModal = document.getElementById('login-modal');
    const postBtn = document.getElementById('main-post-btn');
    const loginForm = document.getElementById('login-form');
    const loginError = document.getElementById('login-error');
    const uploadForm = document.getElementById('upload-form');
    const fileInput = document.getElementById('file-input');
    const fileLabel = document.getElementById('file-label');

    // --- Data Fetching ---
    async function fetchPosts() {
        console.log('Fetching posts from Supabase...');
        const { data, error } = await supabase
            .from('posts')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (error) {
            console.error('Error fetching posts:', error);
            return;
        }
        contentData = data;
        renderGallery();
    }

    function renderGallery(filter = 'all') {
        gallery.innerHTML = '';
        const filteredData = filter === 'all' 
            ? contentData 
            : contentData.filter(item => item.type === filter);
        
        if (filteredData.length === 0) {
            gallery.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: var(--text-muted); padding: 40px;">まだ投稿がありません。最初の投稿をしてみましょう！</p>';
        }

        filteredData.forEach(item => {
            const isLiked = isPostLiked(item.id);
            const card = document.createElement('div');
            card.className = 'content-card';
            card.innerHTML = `
                <div class="card-inner" onclick="openDetail('${item.id}')">
                    <img src="${item.media_url}" alt="${item.title}" class="card-img">
                    <div class="type-tag">${item.type}</div>
                    <div class="card-actions">
                        <button class="action-btn like-btn ${isLiked ? 'liked' : ''}" data-id="${item.id}">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="${isLiked ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
                        </button>
                    </div>
                    <div class="card-overlay">
                        <div class="card-info">
                            <h3>${item.title}</h3>
                            <p class="card-author">by ${item.author_name}</p>
                        </div>
                    </div>
                </div>
            `;
            gallery.appendChild(card);
        });

        // Like buttons in Gallery
        document.querySelectorAll('.like-btn').forEach(btn => {
            if (btn.classList.contains('liked')) {
                btn.style.background = '#ef4444';
                btn.style.borderColor = 'transparent';
            }
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const id = btn.dataset.id;
                if (isPostLiked(id)) return; // 既にスキ済みなら何もしない

                btn.classList.add('liked');
                const svg = btn.querySelector('svg');
                svg.style.fill = 'currentColor';
                btn.style.background = '#ef4444';
                btn.style.borderColor = 'transparent';
                
                saveLike(id);
                // データベースのカウントを増やす
                const { data: newCount, error } = await supabase.rpc('increment_likes', { post_id: id });
                if (!error) {
                    await fetchPosts();
                }
            });
        });
    }

    async function fetchComments(postId) {
        const commentList = document.getElementById('comment-list');
        const { data, error } = await supabase
            .from('comments')
            .select('*')
            .eq('post_id', postId)
            .order('created_at', { ascending: true });

        if (error) {
            console.error('Error fetching comments:', error);
            return;
        }

        commentList.innerHTML = '';
        if (data.length === 0) {
            commentList.innerHTML = '<p style="color: var(--text-muted); font-size: 0.9rem;">まだコメントはありません。</p>';
            return;
        }

        data.forEach(comment => {
            const div = document.createElement('div');
            div.style.background = 'rgba(255,255,255,0.05)';
            div.style.padding = '10px';
            div.style.borderRadius = '8px';
            div.innerHTML = `
                <div style="font-weight: bold; font-size: 0.8rem; margin-bottom: 4px; color: var(--accent-primary);">${comment.author_name}</div>
                <div style="font-size: 0.9rem;">${comment.content}</div>
                <div style="font-size: 0.7rem; color: var(--text-muted); margin-top: 4px;">${new Date(comment.created_at).toLocaleString()}</div>
            `;
            commentList.appendChild(div);
        });
        
        // Scroll to bottom
        commentList.scrollTop = commentList.scrollHeight;
    }

    // --- Modal Actions ---
    function getSession() {
        const session = localStorage.getItem('tonteki_session');
        try {
            return session ? JSON.parse(session) : null;
        } catch (e) {
            // 古い形式のセッション（"active"など）がある場合はクリアする
            localStorage.removeItem('tonteki_session');
            return null;
        }
    }

    function isLoggedIn() {
        return getSession() !== null;
    }

    function isAdmin() {
        const session = getSession();
        return session && session.role === 'admin';
    }

    const logoutBtn = document.getElementById('logout-btn');

    function updateNavActions() {
        if (isLoggedIn()) {
            if (logoutBtn) logoutBtn.classList.remove('hidden');
        } else {
            if (logoutBtn) logoutBtn.classList.add('hidden');
        }
    }

    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            if (confirm('退室（ログアウト）しますか？')) {
                localStorage.removeItem('tonteki_session');
                location.reload();
            }
        });
    }

    let isPendingUpload = false;

    if (postBtn) {
        postBtn.addEventListener('click', () => {
            if (isLoggedIn()) {
                openUploadModal();
            } else {
                isPendingUpload = true;
                loginModal.classList.add('active');
            }
        });
    }

    function openUploadModal() {
        const session = getSession();
        if (session && session.user) {
            const authorInput = document.getElementById('post-author');
            if (authorInput) authorInput.value = session.user;
        }
        uploadModal.classList.add('active');
    }

    window.openDetail = async function(id) {
        // 最新のデータを取得
        const { data: latestItem, error } = await supabase
            .from('posts')
            .select('*')
            .eq('id', id)
            .single();
        
        if (error || !latestItem) return;
        const item = latestItem;

        const imgEl = document.getElementById('detail-img');
        const videoEl = document.getElementById('detail-video');
        const isVideo = item.media_url.match(/\.(mp4|webm|mov|ogg)$/i);

        if (isVideo) {
            imgEl.style.display = 'none';
            videoEl.style.display = 'block';
            videoEl.src = item.media_url;
        } else {
            imgEl.style.display = 'block';
            videoEl.style.display = 'none';
            imgEl.src = item.media_url;
        }

        document.getElementById('detail-title').innerText = item.title;
        document.getElementById('detail-author').innerText = `by ${item.author_name}`;
        document.getElementById('detail-desc').innerText = item.description || '作品概要はありません。';
        document.getElementById('detail-likes').innerText = `❤️ ${item.likes || 0}`;
        
        // Fetch Comments
        fetchComments(id);

        // Handle Comment Submission
        const commentForm = document.getElementById('comment-form');
        commentForm.onsubmit = async (e) => {
            e.preventDefault();
            const author = document.getElementById('comment-author').value;
            const content = document.getElementById('comment-content').value;

            const { error } = await supabase
                .from('comments')
                .insert([{ post_id: id, author_name: author, content: content }]);

            if (error) {
                alert('コメント投稿エラー: ' + error.message);
            } else {
                commentForm.reset();
                fetchComments(id);
            }
        };

        // Handle Like in Detail
        const detailLikeBtn = document.getElementById('detail-like-btn');
        const detailLikesText = document.getElementById('detail-likes');
        
        if (isPostLiked(id)) {
            detailLikeBtn.disabled = true;
            detailLikeBtn.innerText = 'スキ済みです ❤️';
            detailLikeBtn.style.opacity = '0.7';
        } else {
            detailLikeBtn.disabled = false;
            detailLikeBtn.innerText = 'イイネ！を送る';
            detailLikeBtn.style.opacity = '1';
            
            detailLikeBtn.onclick = async () => {
                detailLikeBtn.disabled = true;
                detailLikeBtn.innerText = 'スキを贈りました ❤️';
                
                saveLike(id);
                const { data: newCount, error } = await supabase.rpc('increment_likes', { post_id: id });
                if (!error) {
                    detailLikesText.innerText = `❤️ ${newCount}`;
                    fetchPosts();
                } else {
                    console.error('Like error:', error);
                }
            };
        }
        
        // Link Button
        let linkBtn = document.getElementById('detail-link-btn');
        if (item.link_url) {
            if (!linkBtn) {
                linkBtn = document.createElement('a');
                linkBtn.id = 'detail-link-btn';
                linkBtn.className = 'btn-primary full-width';
                linkBtn.style.textAlign = 'center';
                linkBtn.style.textDecoration = 'none';
                document.getElementById('detail-actions-container').appendChild(linkBtn);
            }
            linkBtn.innerText = item.type === 'game' ? 'ゲームをプレイ' : '詳細・リンクを開く';
            linkBtn.href = item.link_url;
            linkBtn.target = '_blank';
            linkBtn.style.display = 'block';
        } else if (linkBtn) {
            linkBtn.style.display = 'none';
        }

        // Delete Logic
        const deleteBtn = document.getElementById('admin-delete-btn');
        if (isAdmin()) {
            deleteBtn.style.display = 'block';
            deleteBtn.onclick = async () => {
                if (confirm('本当にこの作品を削除しますか？')) {
                    const { error } = await supabase.rpc('delete_post_with_key', { 
                        post_id: id, 
                        master_key: 'Minazuki' 
                    });
                    if (error) {
                        alert('エラー: ' + error.message);
                    } else {
                        alert('削除完了しました。');
                        detailModal.classList.remove('active');
                        fetchPosts();
                    }
                }
            };
        } else {
            deleteBtn.style.display = 'none';
        }
        
        // Auto-fill comment name
        const commentAuthorInput = document.getElementById('comment-author');
        const session = getSession();
        if (commentAuthorInput && session && session.user) {
            commentAuthorInput.value = session.user;
        }
        
        detailModal.classList.add('active');
    };

    // Login Form
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const username = document.getElementById('user-name').value;
        const word = document.getElementById('secret-word').value;
        
        let role = null;
        if (word === 'Minazuki') {
            role = 'admin';
        } else if (word === 'tonteki2026') {
            role = 'member';
        }

        if (role) {
            localStorage.setItem('tonteki_session', JSON.stringify({
                user: username,
                role: role,
                active: true
            }));
            loginModal.classList.remove('active');
            loginError.style.display = 'none';
            updateNavActions();
            
            // もし「投稿する」ボタンから来ていたら、そのまま投稿画面へ
            if (isPendingUpload) {
                openUploadModal();
                isPendingUpload = false;
            }
        } else {
            loginError.style.display = 'block';
        }
    });

    // Upload Form
    const dropZone = document.querySelector('.file-drop-zone');
    
    // Drag and Drop handlers
    ['dragenter', 'dragover'].forEach(eventName => {
        dropZone.addEventListener(eventName, (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropZone.classList.add('drag-over');
        });
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropZone.classList.remove('drag-over');
        });
    });

    dropZone.addEventListener('drop', (e) => {
        const dt = e.dataTransfer;
        const files = dt.files;
        fileInput.files = files;
        handleFileSelect(files[0]);
    });

    fileInput.addEventListener('change', () => {
        handleFileSelect(fileInput.files[0]);
    });

    function handleFileSelect(file) {
        if (file) {
            fileLabel.innerText = `✅ 準備完了: ${file.name}`;
            dropZone.classList.add('has-file');
        } else {
            fileLabel.innerText = 'ファイルをドラッグ＆ドロップ または クリックして選択';
            dropZone.classList.remove('has-file');
        }
    }

        uploadForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const title = document.getElementById('post-title').value;
            const author = document.getElementById('post-author').value;
            const desc = document.getElementById('post-desc').value;
            const type = document.getElementById('post-type').value;
            const linkUrl = document.getElementById('post-link').value;
            const file = fileInput.files[0];

        if (!file || !title) {
            alert('タイトルとファイルを選択してください。');
            return;
        }

        const submitBtn = uploadForm.querySelector('button');
        submitBtn.innerText = 'アップロード中...';
        submitBtn.disabled = true;

        try {
            const fileName = `${Date.now()}_${file.name}`;
            const { error: storageError } = await supabase.storage
                .from('media')
                .upload(fileName, file);

            if (storageError) throw storageError;

            const { data: { publicUrl } } = supabase.storage
                .from('media')
                .getPublicUrl(fileName);

                const { error: dbError } = await supabase
                    .from('posts')
                    .insert([{
                        title,
                        type,
                        media_url: publicUrl,
                        link_url: linkUrl,
                        author_name: author,
                        description: desc,
                        likes: 0
                    }]);

            if (dbError) throw dbError;

            alert('投稿が完了しました！');
            uploadModal.classList.remove('active');
            uploadForm.reset();
            dropZone.classList.remove('has-file');
            fileLabel.innerText = 'ファイルをドラッグ＆ドロップ または クリックして選択';
            fetchPosts();
        } catch (err) {
            console.error(err);
            alert('エラーが発生しました: ' + err.message);
        } finally {
            submitBtn.innerText = 'アップロード';
            submitBtn.disabled = false;
        }
    });

    // Close buttons
    document.querySelectorAll('.close-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            uploadModal.classList.remove('active');
            detailModal.classList.remove('active');
            loginModal.classList.remove('active');
        });
    });

    window.addEventListener('click', (e) => {
        if (e.target === uploadModal) uploadModal.classList.remove('active');
        if (e.target === detailModal) detailModal.classList.remove('active');
        if (e.target === loginModal) loginModal.classList.remove('active');
    });

    // Filter Logic
    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            renderGallery(btn.dataset.filter);
        });
    });

    // Scroll effect
    window.addEventListener('scroll', () => {
        const nav = document.querySelector('nav');
        if (window.scrollY > 50) {
            nav.style.padding = '8px 24px';
            nav.style.borderRadius = '16px';
        } else {
            nav.style.padding = '12px 24px';
            nav.style.borderRadius = '24px';
        }
    });

    // Initial load
    fetchPosts();

    // Check login on start
    updateNavActions();
    if (!isLoggedIn()) {
        loginModal.classList.add('active');
        // 閉じるボタンを一時的に隠す（入室必須にする場合）
        const closeBtn = loginModal.querySelector('.close-btn');
        if (closeBtn) closeBtn.style.display = 'none';
    }
});
