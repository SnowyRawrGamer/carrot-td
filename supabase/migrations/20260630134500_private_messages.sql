CREATE TABLE IF NOT EXISTS private_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES profiles(id),
  receiver_id UUID NOT NULL REFERENCES profiles(id),
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_flagged BOOLEAN NOT NULL DEFAULT false,
  flagged_by UUID REFERENCES profiles(id)
);

CREATE INDEX IF NOT EXISTS private_messages_sender_idx ON private_messages(sender_id);
CREATE INDEX IF NOT EXISTS private_messages_receiver_idx ON private_messages(receiver_id);

-- Enable RLS
ALTER TABLE private_messages ENABLE ROW LEVEL SECURITY;

-- Policy: Users can see messages where they are the sender or receiver
CREATE POLICY "Users can see their own messages" ON private_messages
  FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

-- Policy: Users can send messages if they are the sender
CREATE POLICY "Users can send messages" ON private_messages
  FOR INSERT WITH CHECK (auth.uid() = sender_id);

-- Policy: Users can flag messages where they are the receiver
CREATE POLICY "Users can flag received messages" ON private_messages
  FOR UPDATE USING (auth.uid() = receiver_id)
  WITH CHECK (auth.uid() = receiver_id AND is_flagged = true AND flagged_by = auth.uid());

-- Policy: Moderators can see flagged messages
CREATE POLICY "Staff can see flagged messages" ON private_messages
  FOR SELECT USING (
    is_flagged = true AND 
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND trust_level IN ('basic_moderator', 'trusted_moderator')
    )
  );
