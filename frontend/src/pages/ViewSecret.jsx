import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Lock, Unlock, Eye, EyeOff, Copy, Check, AlertTriangle, Clock, Shield, Loader2 } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { toast } from 'sonner';
import { decryptText, hashPin } from '../lib/crypto';
import { getSecretInfo, viewSecret } from '../lib/api';

export default function ViewSecret() {
  const { secretId } = useParams();
  const [encryptionKey, setEncryptionKey] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [secretInfo, setSecretInfo] = useState(null);
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [decryptedSecret, setDecryptedSecret] = useState('');
  const [showSecret, setShowSecret] = useState(true);
  const [copied, setCopied] = useState(false);
  const [isViewing, setIsViewing] = useState(false);
  const [hasViewed, setHasViewed] = useState(false);

  useEffect(() => {
    // Get encryption key from URL hash
    const hash = window.location.hash.slice(1);
    if (hash) {
      setEncryptionKey(hash);
    }

    // Fetch secret info
    fetchSecretInfo();
  }, [secretId]);

  const fetchSecretInfo = async () => {
    try {
      setLoading(true);
      const info = await getSecretInfo(secretId);
      setSecretInfo(info);
    } catch (err) {
      console.error('Error fetching secret info:', err);
      if (err.response?.status === 404) {
        setError('not_found');
      } else if (err.response?.status === 410) {
        setError('expired');
      } else {
        setError('unknown');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleViewSecret = async () => {
    if (!encryptionKey) {
      toast.error('Encryption key is missing from the URL');
      return;
    }

    if (secretInfo?.has_pin && !pin) {
      toast.error('Please enter the PIN');
      return;
    }

    setIsViewing(true);

    try {
      const pinHash = secretInfo?.has_pin ? hashPin(pin) : null;
      const data = await viewSecret(secretId, pinHash);

      // Decrypt the secret client-side
      const decrypted = decryptText(data.encrypted_data, encryptionKey, data.iv);

      if (!decrypted) {
        toast.error('Failed to decrypt. Invalid encryption key.');
        return;
      }

      setDecryptedSecret(decrypted);
      setHasViewed(true);

      if (data.one_time_view) {
        toast.success('Secret decrypted. This was a one-time view.');
      } else {
        toast.success('Secret decrypted successfully');
      }
    } catch (err) {
      console.error('Error viewing secret:', err);
      if (err.response?.status === 401) {
        toast.error('Invalid PIN. Please try again.');
      } else if (err.response?.status === 410) {
        setError('expired');
      } else if (err.response?.status === 404) {
        setError('not_found');
      } else {
        toast.error('Failed to retrieve secret');
      }
    } finally {
      setIsViewing(false);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(decryptedSecret);
      setCopied(true);
      toast.success('Secret copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error('Failed to copy');
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="w-full max-w-xl mx-auto text-center py-20">
        <Loader2 className="w-10 h-10 text-emerald-400 animate-spin mx-auto mb-4" />
        <p className="text-slate-400">Loading secret...</p>
      </div>
    );
  }

  // Error states
  if (error) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-xl mx-auto text-center"
      >
        <div className={`glass rounded-xl p-8 ${error === 'expired' ? 'error-state' : ''}`}>
          <div className="inline-flex p-4 rounded-full bg-red-500/10 border border-red-500/20 mb-6">
            <AlertTriangle className="w-10 h-10 text-red-400" />
          </div>
          
          <h1 className="font-unbounded text-2xl font-bold text-slate-100 mb-3">
            {error === 'not_found' && 'Secret Not Found'}
            {error === 'expired' && 'Secret Expired'}
            {error === 'unknown' && 'Something Went Wrong'}
          </h1>
          
          <p className="text-slate-400 mb-8">
            {error === 'not_found' && 'This secret does not exist or has already been viewed.'}
            {error === 'expired' && 'This secret has expired and is no longer available.'}
            {error === 'unknown' && 'Unable to retrieve the secret. Please try again later.'}
          </p>
          
          <Link to="/">
            <Button className="rounded-full bg-slate-800 hover:bg-slate-700 text-slate-200">
              Create New Secret
            </Button>
          </Link>
        </div>
      </motion.div>
    );
  }

  // Secret viewed state
  if (hasViewed && decryptedSecret) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-2xl mx-auto"
      >
        <div className="text-center mb-8">
          <div className="inline-flex p-4 rounded-full bg-emerald-500/10 border border-emerald-500/20 mb-6">
            <Unlock className="w-10 h-10 text-emerald-400" />
          </div>
          <h1 className="font-unbounded text-2xl sm:text-3xl font-bold text-slate-100 mb-3">
            Secret Decrypted
          </h1>
          {secretInfo?.one_time_view && (
            <p className="text-amber-400 text-sm flex items-center justify-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              This secret has been destroyed after viewing
            </p>
          )}
        </div>

        <div className="glass rounded-xl p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-slate-400 text-sm">Your Secret</span>
            <button
              onClick={() => setShowSecret(!showSecret)}
              className="text-slate-500 hover:text-slate-300 transition-colors"
            >
              {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          
          <div 
            className="encrypted-display min-h-[100px] whitespace-pre-wrap"
            data-testid="decrypted-secret"
          >
            {showSecret ? decryptedSecret : '••••••••••••••••'}
          </div>
          
          <Button
            data-testid="copy-secret-btn"
            onClick={handleCopy}
            className={`w-full h-12 mt-4 rounded-full font-semibold transition-all ${
              copied 
                ? 'bg-emerald-500 text-slate-950' 
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
            }`}
          >
            {copied ? (
              <>
                <Check className="w-5 h-5 mr-2" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="w-5 h-5 mr-2" />
                Copy Secret
              </>
            )}
          </Button>
        </div>

        <Link to="/">
          <Button
            variant="outline"
            className="w-full h-12 rounded-full border-slate-700 text-slate-300 hover:bg-slate-800"
          >
            Create Your Own Secret
          </Button>
        </Link>
      </motion.div>
    );
  }

  // PIN entry / View secret state
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-xl mx-auto"
    >
      <div className="text-center mb-8">
        <div className="inline-flex p-4 rounded-full bg-emerald-500/10 border border-emerald-500/20 mb-6">
          <Lock className="w-10 h-10 text-emerald-400" />
        </div>
        <h1 className="font-unbounded text-2xl sm:text-3xl font-bold text-slate-100 mb-3">
          {secretInfo?.has_pin ? 'PIN Required' : 'View Secret'}
        </h1>
        <p className="text-slate-400">
          {secretInfo?.has_pin 
            ? 'Enter the PIN to decrypt this secret' 
            : 'Click the button below to decrypt and view the secret'}
        </p>
      </div>

      <div className="glass rounded-xl p-6 mb-6">
        {/* Secret Info */}
        <div className="flex items-center justify-center gap-6 mb-6 text-sm">
          <div className="flex items-center gap-2 text-slate-400">
            <Clock className="w-4 h-4" />
            <span>Expires: {new Date(secretInfo?.expires_at).toLocaleString()}</span>
          </div>
          {secretInfo?.one_time_view && (
            <div className="flex items-center gap-2 text-amber-400">
              <Eye className="w-4 h-4" />
              <span>One-time view</span>
            </div>
          )}
        </div>

        {/* PIN Input */}
        {secretInfo?.has_pin && (
          <div className="mb-6">
            <div className="relative">
              <Input
                data-testid="view-pin-input"
                type={showPin ? 'text' : 'password'}
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="Enter PIN"
                className="bg-slate-900/50 border-slate-700 text-slate-200 h-12 text-center text-lg tracking-widest pr-10"
                onKeyDown={(e) => e.key === 'Enter' && handleViewSecret()}
              />
              <button
                type="button"
                onClick={() => setShowPin(!showPin)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
              >
                {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
        )}

        {/* View Button */}
        <Button
          data-testid="view-secret-btn"
          onClick={handleViewSecret}
          disabled={isViewing || (secretInfo?.has_pin && !pin)}
          className="w-full h-12 rounded-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold btn-glow disabled:opacity-50"
        >
          {isViewing ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Decrypting...
            </>
          ) : (
            <>
              <Shield className="w-5 h-5 mr-2" />
              Decrypt & View Secret
            </>
          )}
        </Button>
      </div>

      <p className="text-center text-slate-500 text-sm">
        Decryption happens entirely in your browser.
      </p>
    </motion.div>
  );
}
