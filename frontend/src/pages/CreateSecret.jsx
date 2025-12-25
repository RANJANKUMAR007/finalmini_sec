import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Lock, Clock, Eye, EyeOff, Shield, Loader2, KeyRound } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Switch } from '../components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { toast } from 'sonner';
import { encryptText, generateEncryptionKey, hashPin } from '../lib/crypto';
import { createSecret } from '../lib/api';

const expiryOptions = [
  { value: '10', label: '10 minutes' },
  { value: '60', label: '1 hour' },
  { value: '360', label: '6 hours' },
  { value: '1440', label: '24 hours' }
];

export default function CreateSecret() {
  const navigate = useNavigate();
  const [secretText, setSecretText] = useState('');
  const [expiryMinutes, setExpiryMinutes] = useState('60');
  const [oneTimeView, setOneTimeView] = useState(true);
  const [usePin, setUsePin] = useState(false);
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const handleCreate = async () => {
    if (!secretText.trim()) {
      toast.error('Please enter a secret to share');
      return;
    }

    if (usePin && (!pin || pin.length < 4)) {
      toast.error('PIN must be at least 4 characters');
      return;
    }

    setIsCreating(true);

    try {
      // Generate encryption key
      const encryptionKey = generateEncryptionKey();
      
      // Encrypt the secret client-side
      const { ciphertext, iv } = encryptText(secretText, encryptionKey);
      
      // Hash PIN if provided
      const pinHash = usePin ? hashPin(pin) : null;

      // Send encrypted data to backend
      const response = await createSecret({
        encryptedData: ciphertext,
        iv: iv,
        pinHash: pinHash,
        expiryMinutes: parseInt(expiryMinutes),
        oneTimeView: oneTimeView
      });

      // Navigate to result page with the secret ID and encryption key
      navigate('/share', {
        state: {
          secretId: response.id,
          encryptionKey: encryptionKey,
          expiryMinutes: parseInt(expiryMinutes),
          oneTimeView: oneTimeView,
          hasPin: usePin
        }
      });

      toast.success('Secret encrypted and stored securely');
    } catch (error) {
      console.error('Error creating secret:', error);
      toast.error('Failed to create secret. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full max-w-2xl mx-auto"
    >
      {/* Header */}
      <div className="mb-10">
        <motion.div 
          className="flex items-center gap-3 mb-4"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
            <Shield className="w-6 h-6 text-emerald-400" />
          </div>
          <h1 className="font-unbounded text-2xl sm:text-3xl font-bold text-slate-100">
            Share a Secret
          </h1>
        </motion.div>
        <p className="text-slate-400 text-base sm:text-lg">
          End-to-end encrypted. Your data never leaves your device unencrypted.
        </p>
      </div>

      {/* Secret Input */}
      <motion.div 
        className="mb-8"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <div className="input-wrapper">
          <div className="glass rounded-xl p-1">
            <textarea
              data-testid="secret-input"
              value={secretText}
              onChange={(e) => setSecretText(e.target.value)}
              placeholder="Enter your secret text here... (passwords, notes, API keys, etc.)"
              className="secret-textarea p-5 bg-transparent focus:outline-none"
              rows={6}
            />
          </div>
        </div>
        <p className="text-slate-500 text-sm mt-2">
          {secretText.length} characters
        </p>
      </motion.div>

      {/* Options Grid */}
      <motion.div 
        className="grid gap-6 sm:grid-cols-2 mb-8"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        {/* Expiry Time */}
        <div className="space-y-3">
          <Label className="flex items-center gap-2 text-slate-300">
            <Clock className="w-4 h-4 text-slate-500" />
            Expires after
          </Label>
          <Select value={expiryMinutes} onValueChange={setExpiryMinutes}>
            <SelectTrigger 
              data-testid="expiry-select" 
              className="glass border-slate-700 text-slate-200"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-slate-900 border-slate-700">
              {expiryOptions.map((option) => (
                <SelectItem 
                  key={option.value} 
                  value={option.value}
                  className="text-slate-200 focus:bg-slate-800 focus:text-slate-100"
                >
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* One-time View */}
        <div className="space-y-3">
          <Label className="flex items-center gap-2 text-slate-300">
            <Eye className="w-4 h-4 text-slate-500" />
            Self-destruct after viewing
          </Label>
          <div className="glass rounded-lg px-4 py-3 flex items-center justify-between">
            <span className="text-slate-400 text-sm">
              {oneTimeView ? 'Enabled' : 'Disabled'}
            </span>
            <Switch
              data-testid="one-time-toggle"
              checked={oneTimeView}
              onCheckedChange={setOneTimeView}
            />
          </div>
        </div>
      </motion.div>

      {/* PIN Protection */}
      <motion.div 
        className="mb-10"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <div className="glass rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <Label className="flex items-center gap-2 text-slate-300">
              <KeyRound className="w-4 h-4 text-slate-500" />
              PIN Protection (Optional)
            </Label>
            <Switch
              data-testid="pin-toggle"
              checked={usePin}
              onCheckedChange={setUsePin}
            />
          </div>
          
          {usePin && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="relative"
            >
              <Input
                data-testid="pin-input"
                type={showPin ? 'text' : 'password'}
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="Enter a PIN (min 4 characters)"
                className="bg-slate-900/50 border-slate-700 text-slate-200 pr-10 pin-input"
                maxLength={20}
              />
              <button
                type="button"
                onClick={() => setShowPin(!showPin)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
              >
                {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </motion.div>
          )}
          
          <p className="text-slate-500 text-sm mt-3">
            Recipient must enter this PIN to view the secret
          </p>
        </div>
      </motion.div>

      {/* Create Button */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <Button
          data-testid="create-btn"
          onClick={handleCreate}
          disabled={isCreating || !secretText.trim()}
          className="w-full h-14 rounded-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-lg btn-glow transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isCreating ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Encrypting...
            </>
          ) : (
            <>
              <Lock className="w-5 h-5 mr-2" />
              Create Secure Link
            </>
          )}
        </Button>
      </motion.div>

      {/* Security Note */}
      <motion.p 
        className="text-center text-slate-500 text-sm mt-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
      >
        Your secret is encrypted in your browser before being sent to our servers.
        <br />
        We never see your unencrypted data.
      </motion.p>
    </motion.div>
  );
}
