import React, { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import 'remixicon/fonts/remixicon.css'

const AuthModel = ({setShowAuthModel}) => {
  const [isLogin, setIsLogin] = useState(true)
  const [showPassword, setShowPassword] = useState(false)
  const [emailError, setEmailError] = useState(false)
  const [passwordError, setPasswordError] = useState(false)
  const [usernameError, setUsernameError] = useState(false)
  const [isExiting, setIsExiting] = useState(false)
  const [isEntering, setIsEntering] = useState(true)
  const modalContentRef = useRef(null)

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    
    return () => {
      document.body.style.overflow = 'auto'
    }
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsEntering(false)
    }, 50)

    return () => clearTimeout(timer)
  }, [])

  const handleEye = () => {
    setShowPassword(!showPassword)
  }

  const toggleAuthMode = () => {
    setIsLogin(!isLogin)
  }

  const closeModal = () => {
    setIsExiting(true)
    setTimeout(() => {
      setShowAuthModel(false)
    }, 300)
  }

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (modalContentRef.current && !modalContentRef.current.contains(e.target)) {
        closeModal()
      }
    }

    document.addEventListener('mousedown', handleOutsideClick)
    
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick)
    }
  }, [])

  const googleLogin = () => {
    // To be implemented
  }

  const handleDiscordLogin = () => {
    // To be implemented
  }

  const handleEmailAuth = () => {
    if (isLogin) {
      // Handle login logic
      console.log('Login functionality to be implemented')
    } else {
      // Handle register logic
      console.log('Register functionality to be implemented')
    }
  }

  return (
    <div className={`fixed top-0 left-0 w-full h-full px-4 z-50 flex items-center justify-center bg-[#000000a1] backdrop-blur-sm transition-all duration-300 ease-in-out ${isExiting ? 'opacity-0' : isEntering ? 'opacity-0' : 'opacity-100'}`}>
      <div 
        ref={modalContentRef}
        className={`w-full max-w-4xl flex flex-col md:flex-row rounded-xl overflow-hidden shadow-2xl bg-black transition-all duration-300 ease-in-out 
        ${isExiting ? 'scale-95 opacity-0' : isEntering ? 'scale-95 opacity-0' : 'scale-100 opacity-100'}`}
      >
        {/* Image - top on mobile, left on desktop */}
        <div className='w-full md:w-2/5 relative hidden md:block md:h-auto'>
          <img 
            src="https://images.unsplash.com/photo-1568819317551-31051b37f69f?w=600&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8OHx8c2V4eXxlbnwwfHwwfHx8MA%3D%3D"
            alt="Promotional Image" 
            className="w-full h-full object-cover"
          />
          <div className='absolute inset-0 bg-gradient-to-b from-transparent to-black/30'></div>
          {/* <div className='absolute bottom-0 left-0 p-6 text-white'>
            <h3 className='text-2xl font-bold text-pink-400'>GoonChan</h3>
            <p className='text-sm mt-2 text-gray-300'>Your premium entertainment platform</p>
          </div> */}
        </div>

        <div className="w-full md:w-3/5 p-8 md:px-16 bg-black text-white transition-all duration-300 ease-in-out">
          <div className="w-full flex justify-end mb-6">
            <button
              onClick={closeModal}
              className="flex group items-center cursor-pointer gap-1"
            >
              <i className="ri-close-line text-2xl text-[#CCCCCC] group-hover:text-white group-hover:rotate-90 transition-all duration-300 ease-out"></i>
            </button>
          </div>

          <h1 className="font-inter font-semibold text-center text-4xl">
            {isLogin ? "Welcome back" : "Let's get started"}
          </h1>
          <h4 className="font-inter text-sm font-medium mt-4 mb-6 tracking-wide leading-5 text-[#cccccc] text-center max-w-[21rem] mx-auto">
            {isLogin 
              ? "You're just One step away from unlocking the best adult content. Log in now!"
              : "You're just One step away from unlocking the best adult content. Sign up now!"}
          </h4>

          <div className="flex flex-col gap-4 justify-center w-full">
            <button
              onClick={() => googleLogin()}
              className="border border-[#acacac] hover:cursor-pointer hover:border-white hover:scale-[1.02] transition-all ease-in-out gap-2 flex items-center justify-center text-white font-inter w-full font-medium py-2.5 px-4 rounded-full duration-300"
            >
              <img src="google.svg" className="w-[1.7rem]" alt="" />
              {isLogin ? "Sign in with Google" : "Sign up with Google"}
            </button>
          </div>

          <div className="flex items-center w-[80%] mx-auto my-4">
            <div className="w-[45%] h-[1px] bg-[#8c8c8c]"></div>
            <div className="px-4 text-[#cccccc]">or</div>
            <div className="w-[45%] h-[1px] bg-[#8c8c8c]"></div>
          </div>

          {/* Username field - only show for registration */}
          {!isLogin && (
            <div className="w-full relative">
              <input
                type="text"
                placeholder="Enter username"
                id="username"
                onClick={() => setUsernameError(false)}
                className={`w-full ${
                  usernameError ? "bg-[#440b0b]" : "bg-[#1f1f1f]"
                } text-white font-inter text-base py-3 px-7 rounded-full focus:outline-none focus:ring-2 focus:ring-[#cccccc] hover:ring-2 hover:ring-[#a2a2a2] focus:border-transparent transition-all ease-out duration-300`}
              />
            </div>
          )}

          <div className={`w-full relative ${!isLogin ? 'mt-4' : ''}`}>
            <input
              type="email"
              placeholder="Enter your email"
              id="email"
              onClick={() => setEmailError(false)}
              className={`w-full ${
                emailError ? "bg-[#440b0b]" : "bg-[#1f1f1f]"
              } text-white font-inter text-base py-3 px-7 rounded-full focus:outline-none focus:ring-2 focus:ring-[#cccccc] hover:ring-2 hover:ring-[#a2a2a2] focus:border-transparent transition-all ease-out duration-300`}
            />
          </div>

          <div className="w-full relative mt-4">
            <input
              type={showPassword ? "text" : "password"}
              placeholder={isLogin ? "Enter your password" : "Create a password"}
              id="password"
              onClick={() => setPasswordError(false)}
              className={`w-full ${
                passwordError ? "bg-[#440b0b]" : "bg-[#1f1f1f]"
              } text-white font-inter text-base py-3 px-7 rounded-full focus:outline-none focus:ring-2 focus:ring-[#cccccc] hover:ring-2 hover:ring-[#a2a2a2] focus:border-transparent transition-all ease-out duration-300`}
            />
            <button
              type="button"
              onClick={handleEye}
              className={`${
                showPassword ? "ri-eye-line" : "ri-eye-off-line"
              } absolute right-6 text-xl top-1/2 transform -translate-y-1/2 text-gray-400 cursor-pointer`}
            ></button>
          </div>

          {/* {isLogin && (
            <div className="flex justify-end mt-2">
              <Link href="/forgot-password" className="text-sm text-[#cccccc] hover:text-white hover:underline">
                Forgot password?
              </Link>
            </div>
          )} */}

          <button
            onClick={handleEmailAuth}
            className="mt-6 hover:scale-[1.02] hover:cursor-pointer bg-[#f2f2f2] text-black font-inter w-full font-medium py-3 px-4 rounded-full hover:bg-[#e1e1e1] transition duration-300"
          >
            {isLogin ? "Login with Email" : "Register with Email"}
          </button>

          <h5 className="font-inter text-[#cccccc] mt-5 text-center">
            {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
            <button
              onClick={toggleAuthMode}
              className="ml-0.5 hover:cursor-pointer hover:underline decoration-[#c1c1c1] text-white"
            >
              {isLogin ? "Sign Up" : "Login"}
            </button>
          </h5>
        </div>
      </div>
    </div>
  )
}

export default AuthModel
