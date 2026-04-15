import React, { useState } from 'react';
import { Adr } from '../types';
import { ArrowLeft, ArrowRight, Save, AlertCircle, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { createAdrMr } from '../lib/gitlab';

interface AdrWizardProps {
  onCancel: () => void;
  onComplete: () => void;
  token: string;
  repoName: string;
  repoBranch: string;
  adrDir: string;
  existingAdrs: Adr[];
}

export function AdrWizard({ onCancel, onComplete, token, repoName, repoBranch, adrDir, existingAdrs }: AdrWizardProps) {
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<Adr>>({
    title: '',
    status: 'proposed',
    relatedAdrId: '',
    context: '',
    decision: '',
    consequences: '',
  });

  const updateForm = (field: keyof Adr, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const isStepOneValid = Boolean(formData.title?.trim());
  const isStepTwoValid = Boolean(formData.context?.trim() && formData.decision?.trim());

  const nextStep = () => setStep((s) => Math.min(s + 1, 3));
  const prevStep = () => setStep((s) => Math.max(s - 1, 1));

  const handleSubmit = async () => {
    if (!formData.title) return;
    setIsSubmitting(true);
    setError(null);
    try {
      await createAdrMr(token, repoName, repoBranch, adrDir, formData.title, formData);
      onComplete();
    } catch (err: any) {
      setError(err.message || 'Failed to create ADR');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-6">
      <button
        onClick={onCancel}
        className="flex items-center gap-2 text-gray-500 hover:text-gray-900 mb-8 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to List
      </button>

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Create New ADR</h1>
        <p className="text-gray-500 mt-2">Document a new architectural decision.</p>
      </div>

      {/* Progress Bar */}
      <div className="flex items-center gap-2 mb-8">
        {[1, 2, 3].map((i) => (
          <React.Fragment key={i}>
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                step >= i ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-400'
              }`}
            >
              {i}
            </div>
            {i < 3 && (
              <div
                className={`flex-1 h-1 rounded-full transition-colors ${
                  step > i ? 'bg-gray-900' : 'bg-gray-100'
                }`}
              />
            )}
          </React.Fragment>
        ))}
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl p-8 shadow-sm min-h-[400px] relative overflow-hidden">
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <h2 className="text-xl font-semibold text-gray-900">Basic Information</h2>
              <div>
                <label htmlFor="adr-title" className="block text-sm font-medium text-gray-700 mb-2">Title</label>
                <input
                  id="adr-title"
                  type="text"
                  value={formData.title}
                  onChange={(e) => updateForm('title', e.target.value)}
                  placeholder="e.g., Use React for the frontend"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none transition-all"
                />
              </div>
              <div>
                <label htmlFor="adr-status" className="block text-sm font-medium text-gray-700 mb-2">Initial Status</label>
                <select
                  id="adr-status"
                  value={formData.status}
                  onChange={(e) => updateForm('status', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none transition-all bg-white"
                >
                  <option value="proposed">Proposed</option>
                  <option value="accepted">Accepted</option>
                </select>
              </div>
              <div>
                <label htmlFor="adr-related" className="block text-sm font-medium text-gray-700 mb-2">Related ADR <span className="text-gray-400 font-normal">(optional)</span></label>
                <p className="text-xs text-gray-500 mb-2">Link this ADR to an existing decision record if it builds on, amends, or relates to one.</p>
                <select
                  id="adr-related"
                  value={formData.relatedAdrId}
                  onChange={(e) => updateForm('relatedAdrId', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none transition-all bg-white"
                >
                  <option value="">No related ADR</option>
                  {[...existingAdrs]
                    .sort((a, b) => a.title.localeCompare(b.title))
                    .map((adr) => (
                      <option key={adr.id} value={adr.id}>
                        {adr.id} - {adr.title}
                      </option>
                    ))}
                </select>
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <h2 className="text-xl font-semibold text-gray-900">Context & Decision</h2>
              <div>
                <label htmlFor="adr-context" className="block text-sm font-medium text-gray-700 mb-2">Context</label>
                <p className="text-xs text-gray-500 mb-2">What is the issue that we're seeing that is motivating this decision or change?</p>
                <textarea
                  id="adr-context"
                  value={formData.context}
                  onChange={(e) => updateForm('context', e.target.value)}
                  required
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none transition-all resize-none"
                />
              </div>
              <div>
                <label htmlFor="adr-decision" className="block text-sm font-medium text-gray-700 mb-2">Decision</label>
                <p className="text-xs text-gray-500 mb-2">What is the change that we're proposing and/or doing?</p>
                <textarea
                  id="adr-decision"
                  value={formData.decision}
                  onChange={(e) => updateForm('decision', e.target.value)}
                  required
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none transition-all resize-none"
                />
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <h2 className="text-xl font-semibold text-gray-900">Consequences & Publish</h2>
              <div>
                <label htmlFor="adr-consequences" className="block text-sm font-medium text-gray-700 mb-2">Consequences <span className="text-gray-400 font-normal">(optional)</span></label>
                <p className="text-xs text-gray-500 mb-2">What becomes easier or more difficult to do because of this change?</p>
                <textarea
                  id="adr-consequences"
                  value={formData.consequences}
                  onChange={(e) => updateForm('consequences', e.target.value)}
                  rows={8}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none transition-all resize-none"
                />
              </div>
              
              <div className="bg-blue-50 text-blue-800 p-4 rounded-lg text-sm mt-6 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <p>
                  This will commit the ADR as a Markdown file to your repository's configured ADR directory and open a new Pull/Merge Request for review using your connected account.
                </p>
              </div>

              {error && (
                <div className="bg-red-50 text-red-600 p-4 rounded-lg text-sm mt-4 border border-red-200">
                  {error}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="flex justify-between mt-8">
        <button
          onClick={prevStep}
          disabled={step === 1 || isSubmitting}
          className="px-6 py-2 rounded-lg font-medium text-gray-600 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Previous
        </button>
        
        {step < 3 ? (
          <button
            onClick={nextStep}
            disabled={(step === 1 && !isStepOneValid) || (step === 2 && !isStepTwoValid) || isSubmitting}
            className="bg-gray-900 text-white px-6 py-2 rounded-lg font-medium hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            Next
            <ArrowRight className="w-4 h-4" />
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Creating MR...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Create MR
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
