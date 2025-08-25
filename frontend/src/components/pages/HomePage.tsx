import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  SparklesIcon, 
  DocumentTextIcon, 
  ChartBarIcon, 
  ShieldCheckIcon,
  ClockIcon,
  CheckCircleIcon,
  RocketLaunchIcon
} from '@heroicons/react/24/outline';
import { Button } from '../ui/Button';
import { Card, CardContent } from '../ui/Card';
import { useSystemStatus } from '../../contexts';

export default function HomePage() {
  const navigate = useNavigate();
  const { aiServiceStatus } = useSystemStatus();
  const features = [
    {
      icon: SparklesIcon,
      title: 'AI Classification',
      description: 'Automatically identify document types with 94% confidence using advanced machine learning.',
      badges: ['Rent Rolls', 'Offering Memos', 'Leases']
    },
    {
      icon: DocumentTextIcon,
      title: 'Smart Region Detection',
      description: 'AI suggests optimal regions for data extraction, learning from your document patterns.',
      badges: ['Unit Numbers', 'Rent Amounts', 'Tenant Names']
    },
    {
      icon: ShieldCheckIcon,
      title: 'Data Validation',
      description: 'AI validates extracted data against real estate market standards and catches errors.',
      badges: ['Price Validation', 'Date Checks', 'Format Correction']
    },
    {
      icon: ChartBarIcon,
      title: 'Quality Scoring',
      description: 'Get detailed quality scores and confidence levels for every extraction with AI assessment.',
      badges: ['96% Quality', 'Confidence', 'Analytics']
    }
  ];

  const stats = [
    { label: 'Accuracy Rate', value: '95%', icon: CheckCircleIcon },
    { label: 'Processing Time', value: '30s', icon: ClockIcon },
    { label: 'Document Types', value: '6+', icon: DocumentTextIcon },
    { label: 'AI Powered', value: 'Yes', icon: SparklesIcon }
  ];

  return (
    <>
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-primary-600 to-primary-800 text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="flex items-center mb-6">
                <SparklesIcon className="h-8 w-8 text-primary-200 mr-3 animate-pulse-slow" />
                <span className="bg-primary-500 px-3 py-1 rounded-full text-sm font-medium flex items-center space-x-2">
                  <span>AI-Powered</span>
                  <div className={`h-2 w-2 rounded-full ${
                    aiServiceStatus.status === 'connected' ? 'bg-success-400' : 
                    aiServiceStatus.status === 'error' ? 'bg-error-400' : 'bg-neutral-400'
                  }`} title={`AI Service: ${aiServiceStatus.status}`} />
                </span>
              </div>
              
              <h1 className="text-5xl lg:text-6xl font-bold mb-6 leading-tight">
                Transform Your <br />
                <span className="text-primary-200">Real Estate Documents</span>
              </h1>
              
              <p className="text-xl text-primary-100 mb-8 leading-relaxed">
                Extract, validate, and export data from rent rolls, offering memos, leases, 
                and comparable sales with 95%+ accuracy using advanced AI technology.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4">
                <Button
                  onClick={() => navigate('/tool')}
                  variant="secondary"
                  size="lg"
                  className="bg-white text-primary-600 hover:bg-primary-50"
                >
                  <RocketLaunchIcon className="h-5 w-5 mr-2" />
                  Start Processing Now
                </Button>
                <Button
                  onClick={() => navigate('/dashboard')}
                  variant="outline"
                  size="lg"
                  className="border-white text-white hover:bg-white hover:text-primary-600"
                >
                  View Dashboard
                </Button>
              </div>
            </div>
            
            <div className="relative">
              <div className="bg-white/10 backdrop-blur rounded-2xl p-8">
                <DocumentTextIcon className="h-32 w-32 text-primary-200 mx-auto animate-pulse-slow" />
                <div className="mt-6 space-y-2">
                  <div className="h-2 bg-white/20 rounded w-3/4"></div>
                  <div className="h-2 bg-white/20 rounded w-1/2"></div>
                  <div className="h-2 bg-white/20 rounded w-2/3"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="bg-primary-500 text-white rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                  <stat.icon className="h-8 w-8" />
                </div>
                <div className="text-3xl font-bold text-neutral-900 mb-2">
                  {stat.value}
                </div>
                <div className="text-neutral-600">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-neutral-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-neutral-900 mb-4">
              AI-Powered Features
            </h2>
            <p className="text-xl text-neutral-600 max-w-2xl mx-auto">
              Experience the future of document processing with our advanced AI technology
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="p-8 hover:shadow-medium transition-shadow">
                <CardContent className="p-0">
                  <div className="bg-primary-100 rounded-full w-16 h-16 flex items-center justify-center mb-6">
                    <feature.icon className="h-8 w-8 text-primary-600" />
                  </div>
                  
                  <h3 className="text-xl font-semibold text-neutral-900 mb-4">
                    {feature.title}
                  </h3>
                  
                  <p className="text-neutral-600 mb-6 leading-relaxed">
                    {feature.description}
                  </p>
                  
                  <div className="flex flex-wrap gap-2">
                    {feature.badges.map((badge, badgeIndex) => (
                      <span 
                        key={badgeIndex}
                        className="bg-primary-100 text-primary-800 px-3 py-1 rounded-full text-sm font-medium"
                      >
                        {badge}
                      </span>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-primary-600 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-bold mb-6">
            Ready to Transform Your Documents?
          </h2>
          <p className="text-xl text-primary-100 mb-8">
            Join thousands of real estate professionals who trust our AI-powered solution
          </p>
          <Button
            onClick={() => navigate('/tool')}
            variant="secondary"
            size="lg"
            className="bg-white text-primary-600 hover:bg-primary-50"
          >
            <RocketLaunchIcon className="h-5 w-5 mr-2" />
            Get Started Now
          </Button>
        </div>
      </section>
    </>
  );
}