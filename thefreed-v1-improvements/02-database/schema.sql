-- Esquema de base de datos para thefreed.v1
-- Base PostgreSQL optimizada para red social

-- Extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- Para búsqueda de texto
CREATE EXTENSION IF NOT EXISTS "btree_gin"; -- Para índices compuestos

-- Enum types
CREATE TYPE post_type AS ENUM ('text', 'image', 'video', 'link');
CREATE TYPE post_visibility AS ENUM ('public', 'followers', 'private');
CREATE TYPE relationship_type AS ENUM ('follow', 'close_friend', 'mute', 'block');
CREATE TYPE notification_type AS ENUM ('like', 'comment', 'follow', 'mention', 'repost');
CREATE TYPE message_status AS ENUM ('sent', 'delivered', 'read');

-- ==============================================
-- TABLA: users
-- ==============================================
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    display_name VARCHAR(100),
    bio TEXT,
    avatar_url VARCHAR(500),
    banner_url VARCHAR(500),
    
    -- Configuración de cuenta
    is_private BOOLEAN DEFAULT false,
    is_verified BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    
    -- Localización y preferencias
    language VARCHAR(10) DEFAULT 'es',
    timezone VARCHAR(50),
    
    -- Contadores (desnormalizados para performance)
    followers_count INTEGER DEFAULT 0,
    following_count INTEGER DEFAULT 0,
    posts_count INTEGER DEFAULT 0,
    
    -- Autenticación
    password_hash VARCHAR(255),
    email_verified_at TIMESTAMP WITH TIME ZONE,
    last_login_at TIMESTAMP WITH TIME ZONE,
    
    -- Auditoría
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE -- Soft delete
);

-- Índices para users
CREATE INDEX idx_users_username ON users(username) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_email ON users(email) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_is_active ON users(is_active) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_created_at ON users(created_at);
CREATE INDEX idx_users_search ON users USING gin(to_tsvector('spanish', coalesce(username, '') || ' ' || coalesce(display_name, '') || ' ' || coalesce(bio, '')));

-- ==============================================
-- TABLA: posts
-- ==============================================
CREATE TABLE posts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Contenido
    content TEXT,
    type post_type NOT NULL DEFAULT 'text',
    visibility post_visibility NOT NULL DEFAULT 'public',
    
    -- Metadatos de media
    media_urls JSONB, -- Array de URLs de imágenes/videos
    media_metadata JSONB, -- Dimensiones, duración, etc.
    
    -- Link preview (si type = 'link')
    link_url VARCHAR(500),
    link_title VARCHAR(200),
    link_description TEXT,
    link_image_url VARCHAR(500),
    
    -- Engagement (desnormalizado)
    likes_count INTEGER DEFAULT 0,
    comments_count INTEGER DEFAULT 0,
    reposts_count INTEGER DEFAULT 0,
    
    -- Idioma detectado automáticamente
    detected_language VARCHAR(10),
    
    -- Moderación
    is_flagged BOOLEAN DEFAULT false,
    flagged_reason TEXT,
    
    -- Algoritmo de feed
    engagement_score FLOAT DEFAULT 0, -- Para ranking
    
    -- Auditoría
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Índices para posts
CREATE INDEX idx_posts_author_id ON posts(author_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_posts_created_at ON posts(created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_posts_visibility ON posts(visibility) WHERE deleted_at IS NULL;
CREATE INDEX idx_posts_type ON posts(type) WHERE deleted_at IS NULL;
CREATE INDEX idx_posts_engagement_score ON posts(engagement_score DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_posts_language ON posts(detected_language) WHERE deleted_at IS NULL;
CREATE INDEX idx_posts_search ON posts USING gin(to_tsvector('spanish', coalesce(content, '') || ' ' || coalesce(link_title, '') || ' ' || coalesce(link_description, '')));

-- Índice compuesto para feed cronológico
CREATE INDEX idx_posts_feed_chrono ON posts(author_id, created_at DESC) WHERE deleted_at IS NULL AND visibility IN ('public', 'followers');

-- Índice compuesto para feed rankeado
CREATE INDEX idx_posts_feed_ranked ON posts(engagement_score DESC, created_at DESC) WHERE deleted_at IS NULL AND visibility IN ('public', 'followers');

-- ==============================================
-- TABLA: relationships (follows, mutes, blocks)
-- ==============================================
CREATE TABLE relationships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    follower_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    followee_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type relationship_type NOT NULL DEFAULT 'follow',
    
    -- Para algoritmo de feed
    weight FLOAT DEFAULT 1.0, -- Mayor peso = más relevancia
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraint para evitar auto-seguirse
    CONSTRAINT chk_no_self_follow CHECK (follower_id != followee_id),
    -- Única relación por par de usuarios
    UNIQUE(follower_id, followee_id)
);

-- Índices para relationships
CREATE INDEX idx_relationships_follower ON relationships(follower_id, type);
CREATE INDEX idx_relationships_followee ON relationships(followee_id, type);
CREATE INDEX idx_relationships_type ON relationships(type);
CREATE INDEX idx_relationships_weight ON relationships(weight DESC) WHERE type = 'follow';

-- ==============================================
-- TABLA: likes
-- ==============================================
CREATE TABLE likes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Un usuario solo puede dar like una vez por post
    UNIQUE(user_id, post_id)
);

-- Índices para likes
CREATE INDEX idx_likes_user_id ON likes(user_id);
CREATE INDEX idx_likes_post_id ON likes(post_id);
CREATE INDEX idx_likes_created_at ON likes(created_at);

-- ==============================================
-- TABLA: comments
-- ==============================================
CREATE TABLE comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    parent_id UUID REFERENCES comments(id) ON DELETE CASCADE, -- Para replies
    
    content TEXT NOT NULL,
    
    -- Engagement
    likes_count INTEGER DEFAULT 0,
    
    -- Moderación
    is_flagged BOOLEAN DEFAULT false,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Índices para comments
CREATE INDEX idx_comments_post_id ON comments(post_id, created_at) WHERE deleted_at IS NULL;
CREATE INDEX idx_comments_author_id ON comments(author_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_comments_parent_id ON comments(parent_id) WHERE deleted_at IS NULL;

-- ==============================================
-- TABLA: notifications
-- ==============================================
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    recipient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    actor_id UUID REFERENCES users(id) ON DELETE SET NULL, -- Quién causó la notificación
    
    type notification_type NOT NULL,
    
    -- Referencias polímorficas
    target_type VARCHAR(50), -- 'post', 'comment', 'user'
    target_id UUID, -- ID del objeto referenciado
    
    -- Metadatos adicionales
    metadata JSONB,
    
    -- Estado
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para notifications
CREATE INDEX idx_notifications_recipient ON notifications(recipient_id, created_at DESC);
CREATE INDEX idx_notifications_unread ON notifications(recipient_id) WHERE is_read = false;
CREATE INDEX idx_notifications_type ON notifications(type);
CREATE INDEX idx_notifications_target ON notifications(target_type, target_id);

-- ==============================================
-- TABLA: direct_messages
-- ==============================================
CREATE TABLE direct_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL, -- Agrupa mensajes en conversación
    sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    recipient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    content TEXT NOT NULL,
    
    -- Media attachments
    media_urls JSONB,
    
    -- Estado del mensaje
    status message_status DEFAULT 'sent',
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Índices para direct_messages
CREATE INDEX idx_dm_conversation ON direct_messages(conversation_id, created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_dm_sender ON direct_messages(sender_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_dm_recipient ON direct_messages(recipient_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_dm_status ON direct_messages(status) WHERE deleted_at IS NULL;

-- ==============================================
-- TABLA: hashtags
-- ==============================================
CREATE TABLE hashtags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    usage_count INTEGER DEFAULT 0,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para hashtags
CREATE INDEX idx_hashtags_name ON hashtags(name);
CREATE INDEX idx_hashtags_usage_count ON hashtags(usage_count DESC);
CREATE INDEX idx_hashtags_search ON hashtags USING gin(name gin_trgm_ops);

-- ==============================================
-- TABLA: post_hashtags (relación muchos a muchos)
-- ==============================================
CREATE TABLE post_hashtags (
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    hashtag_id UUID NOT NULL REFERENCES hashtags(id) ON DELETE CASCADE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    PRIMARY KEY (post_id, hashtag_id)
);

-- Índices para post_hashtags
CREATE INDEX idx_post_hashtags_post_id ON post_hashtags(post_id);
CREATE INDEX idx_post_hashtags_hashtag_id ON post_hashtags(hashtag_id);

-- ==============================================
-- TABLA: user_sessions (para tracking de actividad)
-- ==============================================
CREATE TABLE user_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Información de sesión
    session_token VARCHAR(255) NOT NULL UNIQUE,
    user_agent TEXT,
    ip_address INET,
    
    -- Timestamps
    last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para user_sessions
CREATE INDEX idx_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_sessions_token ON user_sessions(session_token);
CREATE INDEX idx_sessions_expires_at ON user_sessions(expires_at);
CREATE INDEX idx_sessions_last_activity ON user_sessions(last_activity_at);

-- ==============================================
-- FUNCIONES Y TRIGGERS
-- ==============================================

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Aplicar trigger a las tablas que lo necesitan
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_posts_updated_at BEFORE UPDATE ON posts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_relationships_updated_at BEFORE UPDATE ON relationships
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_comments_updated_at BEFORE UPDATE ON comments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_direct_messages_updated_at BEFORE UPDATE ON direct_messages
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_hashtags_updated_at BEFORE UPDATE ON hashtags
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Función para actualizar contadores de engagement
CREATE OR REPLACE FUNCTION update_engagement_counters()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_TABLE_NAME = 'likes' THEN
        IF TG_OP = 'INSERT' THEN
            UPDATE posts SET likes_count = likes_count + 1 WHERE id = NEW.post_id;
        ELSIF TG_OP = 'DELETE' THEN
            UPDATE posts SET likes_count = GREATEST(0, likes_count - 1) WHERE id = OLD.post_id;
        END IF;
    ELSIF TG_TABLE_NAME = 'comments' THEN
        IF TG_OP = 'INSERT' THEN
            UPDATE posts SET comments_count = comments_count + 1 WHERE id = NEW.post_id;
        ELSIF TG_OP = 'DELETE' THEN
            UPDATE posts SET comments_count = GREATEST(0, comments_count - 1) WHERE id = OLD.post_id;
        END IF;
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ language 'plpgsql';

-- Triggers para actualizar contadores
CREATE TRIGGER update_likes_counter AFTER INSERT OR DELETE ON likes
    FOR EACH ROW EXECUTE FUNCTION update_engagement_counters();

CREATE TRIGGER update_comments_counter AFTER INSERT OR DELETE ON comments
    FOR EACH ROW EXECUTE FUNCTION update_engagement_counters();

-- Función para calcular engagement_score
CREATE OR REPLACE FUNCTION calculate_engagement_score(post_id UUID)
RETURNS FLOAT AS $$
DECLARE
    score FLOAT := 0;
    age_hours FLOAT;
    likes_count INTEGER;
    comments_count INTEGER;
BEGIN
    SELECT 
        p.likes_count,
        p.comments_count,
        EXTRACT(EPOCH FROM (NOW() - p.created_at)) / 3600
    INTO likes_count, comments_count, age_hours
    FROM posts p
    WHERE p.id = post_id;
    
    -- Fórmula de engagement: (likes + comments*2) / (edad_en_horas + 1)
    score := (likes_count + comments_count * 2.0) / (age_hours + 1.0);
    
    RETURN score;
END;
$$ language 'plpgsql';

-- ==============================================
-- VISTAS OPTIMIZADAS
-- ==============================================

-- Vista para feed público (posts públicos recientes)
CREATE VIEW feed_public AS
SELECT 
    p.*,
    u.username,
    u.display_name,
    u.avatar_url,
    u.is_verified
FROM posts p
JOIN users u ON p.author_id = u.id
WHERE p.deleted_at IS NULL 
    AND u.deleted_at IS NULL 
    AND u.is_active = true
    AND p.visibility = 'public'
ORDER BY p.created_at DESC;

-- Vista para estadísticas de usuario
CREATE VIEW user_stats AS
SELECT 
    u.id,
    u.username,
    u.followers_count,
    u.following_count,
    u.posts_count,
    COUNT(DISTINCT l.id) as total_likes_received,
    COUNT(DISTINCT c.id) as total_comments_received
FROM users u
LEFT JOIN posts p ON u.id = p.author_id AND p.deleted_at IS NULL
LEFT JOIN likes l ON p.id = l.post_id
LEFT JOIN comments c ON p.id = c.post_id AND c.deleted_at IS NULL
WHERE u.deleted_at IS NULL
GROUP BY u.id, u.username, u.followers_count, u.following_count, u.posts_count;

-- Comentario final
COMMENT ON DATABASE current_database() IS 'TheFreed v1 - Red social optimizada para performance y escalabilidad';