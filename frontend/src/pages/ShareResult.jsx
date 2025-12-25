import { useEffect, useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { QRCodeSVG } from 'qrcode.react';
import { Copy, Check, Plus, Shield, Clock, Eye, KeyRound, QrCode, Link as LinkIcon } from 'lucide-react';
import { Button } from '../components/ui/button';
import { toast } from 'sonner';

export default function ShareResult() {
  const location = useLocation();
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);
  const [showQR, setShowQR] = useState(true);

  const { secretId, encryptionKey, expiryMinutes, oneTimeView, hasPin } = location.state || {};

  useEffect(() => {
    if (!secretId || !encryptionKey) {
      navigate('/');
    }
  }, [secretId, encryptionKey, navigate]);

  if (!secretId || !encryptionKey) {
    return null;
  }

  // Construct the share URL with the encryption key in the hash (never sent to server)
  const shareUrl = `${window.location.origin}/view/${secretId}#${encryptionKey}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success('Link copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error('Failed to copy link');
    }
  };

  const getExpiryLabel = (minutes) => {
    if (minutes < 60) return `${minutes} minutes`;
    if (minutes === 60) return '1 hour';
    if (minutes < 1440) return `${minutes / 60} hours`;
    return '24 hours';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full max-w-2xl mx-auto"
    >
      {/* Success Header */}
      <div className="text-center mb-10">
        <motion.div 
          className="inline-flex p-4 rounded-full bg-emerald-500/10 border border-emerald-500/20 mb-6"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', delay: 0.2 }}
        >
          <Shield className="w-10 h-10 text-emerald-400" />
        </motion.div>
        <h1 className="font-unbounded text-2xl sm:text-3xl font-bold text-slate-100 mb-3">
          Secret Created
        </h1>
        <p className="text-slate-400 text-base sm:text-lg">
          Share the link below with your recipient
        </p>
      </div>

      {/* Link Display */}
      <motion.div 
        className="glass rounded-xl p-6 mb-6"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <div className="flex items-center gap-2 mb-4">
          <LinkIcon className="w-4 h-4 text-slate-500" />
          <span className="text-slate-400 text-sm font-medium">Secure Share Link</span>
        </div>
        
        <div className="share-link mb-4 select-all" data-testid="share-link">
          {shareUrl}
        </div>
        
        <Button
          data-testid="copy-btn"
          onClick={handleCopy}
          className={`w-full h-12 rounded-full font-semibold transition-all ${
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
              Copy Link
            </>
          )}
        </Button>
      </motion.div>

      {/* QR Code */}
      <motion.div 
        className="glass rounded-xl p-6 mb-6"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <QrCode className="w-4 h-4 text-slate-500" />
            <span className="text-slate-400 text-sm font-medium">QR Code</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowQR(!showQR)}
            className="text-slate-400 hover:text-slate-200"
          >
            {showQR ? 'Hide' : 'Show'}
          </Button>
        </div>
        
        {showQR && (
          <motion.div 
            className="flex justify-center"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <div className="qr-container" data-testid="qr-code">
              <QRCodeSVG
                value={shareUrl}
                size={180}
                level="M"
                includeMargin={false}
                bgColor="#ffffff"
                fgColor="#020617"
              />
            </div>
          </motion.div>
        )}
      </motion.div>

      {/* Settings Summary */}
      <motion.div 
        className="grid gap-4 sm:grid-cols-3 mb-10"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <div className="glass rounded-lg p-4 text-center">
          <Clock className="w-5 h-5 text-slate-500 mx-auto mb-2" />
          <p className="text-slate-300 text-sm font-medium">Expires in</p>
          <p className="text-emerald-400 font-semibold">{getExpiryLabel(expiryMinutes)}</p>
        </div>
        
        <div className="glass rounded-lg p-4 text-center">
          <Eye className="w-5 h-5 text-slate-500 mx-auto mb-2" />
          <p className="text-slate-300 text-sm font-medium">View Limit</p>
          <p className="text-emerald-400 font-semibold">
            {oneTimeView ? 'One-time only' : 'Multiple views'}
          </p>
        </div>
        
        <div className="glass rounded-lg p-4 text-center">
          <KeyRound className="w-5 h-5 text-slate-500 mx-auto mb-2" />
          <p className="text-slate-300 text-sm font-medium">PIN Protected</p>
          <p className={`font-semibold ${hasPin ? 'text-emerald-400' : 'text-slate-500'}`}>
            {hasPin ? 'Yes' : 'No'}
          </p>
        </div>
      </motion.div>

      {/* Create Another */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
      >
        <Link to="/">
          <Button
            data-testid="create-another-btn"
            variant="outline"
            className="w-full h-12 rounded-full border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-slate-100"
          >
            <Plus className="w-5 h-5 mr-2" />
            Create Another Secret
          </Button>
        </Link>
      </motion.div>

      {/* Security Note */}
      <motion.p 
        className="text-center text-slate-500 text-sm mt-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7 }}
      >
        The encryption key is embedded in the URL hash and never sent to our servers.
      </motion.p>
    </motion.div>
  );
}
