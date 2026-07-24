"use client";

import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { 
  Users, 
  Clock, 
  Calendar, 
  CreditCard, 
  Shield, 
  MapPin, 
  TrendingUp, 
  CheckCircle,
  ArrowRight,
  Building2,
  Menu,
  X
} from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [companyCode, setCompanyCode] = useState("");
  const router = useRouter();

  const handleCompanyLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (companyCode.trim()) {
      router.push(`/${companyCode.trim().toUpperCase()}`);
    }
  };

  const features = [
    {
      icon: <Users className="h-6 w-6" />,
      title: "Employee Management",
      description: "Complete employee lifecycle management from onboarding to offboarding."
    },
    {
      icon: <Clock className="h-6 w-6" />,
      title: "Time & Attendance",
      description: "Track attendance with geo-fencing. Clock in/out from office location only."
    },
    {
      icon: <MapPin className="h-6 w-6" />,
      title: "Geo-Fencing",
      description: "Set office boundaries and ensure employees mark attendance from authorized locations."
    },
    {
      icon: <Calendar className="h-6 w-6" />,
      title: "Leave Management",
      description: "Streamlined leave requests and approvals with real-time balance tracking."
    },
    {
      icon: <CreditCard className="h-6 w-6" />,
      title: "Payroll Processing",
      description: "Automated payroll calculations, payslip generation, and compliance reporting."
    },
    {
      icon: <TrendingUp className="h-6 w-6" />,
      title: "Performance Reviews",
      description: "360-degree feedback system with goal tracking and appraisal management."
    }
  ];

  const steps = [
    { number: "1", title: "Register Company", description: "Create your company profile with GST and office location" },
    { number: "2", title: "Set Geo-Fence", description: "Define office boundaries for attendance tracking" },
    { number: "3", title: "Add Employees", description: "Invite your team members to the platform" },
    { number: "4", title: "Start Tracking", description: "Begin managing attendance, leaves, and payroll" }
  ];

  return (
    <div className="min-h-screen bg-background transition-colors duration-300">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <Building2 className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-bold text-foreground">HRM Pro</span>
            </div>
            
            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-gray-600 hover:text-gray-900 transition-colors">Features</a>
              <a href="#how-it-works" className="text-gray-600 hover:text-gray-900 transition-colors">How it Works</a>
              <a href="#pricing" className="text-gray-600 hover:text-gray-900 transition-colors">Pricing</a>
              <Link href="/register">
                <Button>Get Started</Button>
              </Link>
            </div>

            {/* Mobile Menu Button */}
            <button 
              className="md:hidden p-2"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-t border-gray-100">
            <div className="px-4 py-4 space-y-3">
              <a href="#features" className="block text-gray-600 hover:text-gray-900">Features</a>
              <a href="#how-it-works" className="block text-gray-600 hover:text-gray-900">How it Works</a>
              <a href="#pricing" className="block text-gray-600 hover:text-gray-900">Pricing</a>
              <Link href="/register" className="block">
                <Button className="w-full">Get Started</Button>
              </Link>
            </div>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 lg:pt-40 lg:pb-32 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-full text-sm font-medium">
                <Shield className="h-4 w-4" />
                Geo-Fencing Enabled
              </div>
              <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold text-foreground tracking-tight leading-[1.1]">
                Modern HR Management with{" "}
                <span className="text-primary bg-clip-text">Location Intelligence</span>
              </h1>
              <p className="text-xl text-muted-foreground max-w-xl leading-relaxed">
                Streamline your HR operations with geo-fenced attendance, automated payroll, 
                and comprehensive employee management. Built for professional modern teams.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link href="/register">
                  <Button size="lg" className="w-full sm:w-auto h-14 px-8 text-lg rounded-full shadow-lg shadow-primary/20 hover:shadow-xl transition-all">
                    Register Your Company
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
                <Link href="/login">
                  <Button variant="outline" size="lg" className="w-full sm:w-auto h-14 px-8 text-lg rounded-full border-2 hover:bg-muted transition-all">
                    Sign In
                  </Button>
                </Link>
              </div>
              <div className="flex flex-wrap items-center gap-6 text-sm font-medium text-muted-foreground/80">
                <div className="flex items-center gap-2">
                  <div className="h-5 w-5 rounded-full bg-green-500/10 flex items-center justify-center">
                     <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                  </div>
                  GST Compliant
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-5 w-5 rounded-full bg-green-500/10 flex items-center justify-center">
                     <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                  </div>
                  Free 14-day trial
                </div>
              </div>
            </div>
            <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-[3rem] blur-3xl opacity-20 group-hover:opacity-30 transition-opacity"></div>
                <div className="relative bg-card rounded-[2.5rem] shadow-2xl p-8 border border-border overflow-hidden">
                  <div className="absolute top-0 right-0 p-4">
                    <div className="h-24 w-24 bg-indigo-500/5 rounded-full blur-2xl animate-pulse"></div>
                  </div>
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 bg-primary/10 rounded-full flex items-center justify-center">
                      <Building2 className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">Acme Corp</p>
                      <p className="text-sm text-gray-500">HR Dashboard</p>
                    </div>
                  </div>
                  <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                    Active
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="bg-gray-50 rounded-xl p-4">
                    <p className="text-sm text-gray-500 mb-1">Present Today</p>
                    <p className="text-2xl font-bold text-gray-900">142</p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-4">
                    <p className="text-sm text-gray-500 mb-1">On Leave</p>
                    <p className="text-2xl font-bold text-gray-900">8</p>
                  </div>
                </div>
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <div className="h-8 w-8 bg-gray-200 rounded-full"></div>
                      <div className="flex-1">
                        <div className="h-3 bg-gray-200 rounded w-24 mb-1"></div>
                        <div className="h-2 bg-gray-200 rounded w-16"></div>
                      </div>
                      <div className="h-6 w-16 bg-green-100 rounded-full"></div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-32 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-20 text-balance">
            <h2 className="text-4xl sm:text-5xl font-bold text-foreground mb-6 tracking-tight">
              Everything you need to manage your workforce
            </h2>
            <p className="text-xl text-muted-foreground leading-relaxed">
              From attendance tracking with geo-fencing to payroll processing, 
              we have got all your HR needs covered in one elegant platform.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div 
                key={index}
                className="group relative bg-card rounded-3xl p-8 border border-border hover:border-primary/50 hover:shadow-2xl hover:shadow-primary/5 transition-all duration-300"
              >
                <div className="h-14 w-14 bg-primary/10 rounded-2xl flex items-center justify-center text-primary mb-6 group-hover:scale-110 transition-transform">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-bold text-foreground mb-3">{feature.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section id="how-it-works" className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Get started in minutes
            </h2>
            <p className="text-lg text-gray-600">
              Simple 4-step process to set up your company and start managing your team.
            </p>
          </div>
          <div className="grid md:grid-cols-4 gap-8">
            {steps.map((step, index) => (
              <div key={index} className="relative">
                <div className="text-center">
                  <div className="inline-flex items-center justify-center h-16 w-16 bg-blue-600 text-white text-2xl font-bold rounded-full mb-4">
                    {step.number}
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{step.title}</h3>
                  <p className="text-gray-600 text-sm">{step.description}</p>
                </div>
                {index < steps.length - 1 && (
                  <div className="hidden md:block absolute top-8 left-1/2 w-full h-0.5 bg-blue-100">
                    <ArrowRight className="absolute right-0 -top-2 h-4 w-4 text-blue-300" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Company Login Section */}
      <section className="py-16 bg-gray-50 border-y border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4">
              Employee Login
            </h2>
            <p className="text-gray-600 mb-6">
              Enter your company code to access your company&apos;s login page
            </p>
            <form onSubmit={handleCompanyLogin} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
              <input
                type="text"
                value={companyCode}
                onChange={(e) => setCompanyCode(e.target.value.toUpperCase())}
                placeholder="Enter company code (e.g., WEBATLAS)"
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                required
              />
              <Button type="submit" className="px-6">
                Go to Login
              </Button>
            </form>
            <p className="text-sm text-gray-500 mt-4">
              Or access directly: <code className="bg-gray-200 px-2 py-1 rounded">yourdomain.com/YOURCODE</code>
            </p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-blue-600">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Ready to modernize your HR operations?
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            Join thousands of companies already using HRM Pro to manage their workforce efficiently.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/register">
              <Button size="lg" variant="secondary" className="w-full sm:w-auto">
                Register Your Company Free
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link href="/login">
              <Button size="lg" variant="outline" className="w-full sm:w-auto border-white text-white hover:bg-white hover:text-blue-600">
                Existing User? Sign In
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="h-8 w-8 bg-blue-600 rounded-lg flex items-center justify-center">
                  <Building2 className="h-5 w-5 text-white" />
                </div>
                <span className="text-xl font-bold text-white">HRM Pro</span>
              </div>
              <p className="text-sm">Modern HR management solution for Indian businesses.</p>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#features" className="hover:text-white transition-colors">Features</a></li>
                <li><a href="#pricing" className="hover:text-white transition-colors">Pricing</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Integrations</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-white transition-colors">About</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Blog</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Contact</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-white transition-colors">Privacy</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Terms</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-8 text-center text-sm">
            © 2024 HRM Pro. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
