package com.whitelisthub.api.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Slf4j
@Component
public class RateLimitFilter extends OncePerRequestFilter {
    
    private static final long RATE_LIMIT_WINDOW = 60000; // 1 minute
    private static final int RATE_LIMIT_MAX = 10;
    
    private final Map<String, RateLimitEntry> rateLimitMap = new ConcurrentHashMap<>();
    
    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, 
                                   FilterChain filterChain) throws ServletException, IOException {
        
        if (request.getRequestURI().equals("/api/health")) {
            filterChain.doFilter(request, response);
            return;
        }
        
        String ip = getClientIp(request);
        long now = System.currentTimeMillis();
        
        RateLimitEntry entry = rateLimitMap.get(ip);
        
        if (entry == null) {
            rateLimitMap.put(ip, new RateLimitEntry(1, now + RATE_LIMIT_WINDOW));
            filterChain.doFilter(request, response);
            return;
        }
        
        if (now > entry.resetTime) {
            entry.count = 1;
            entry.resetTime = now + RATE_LIMIT_WINDOW;
            filterChain.doFilter(request, response);
            return;
        }
        
        if (entry.count >= RATE_LIMIT_MAX) {
            log.warn("[RATE_LIMIT] Exceeded for IP: {}", ip);
            
            response.setStatus(HttpServletResponse.SC_TOO_MANY_REQUESTS);
            response.setContentType("application/json");
            response.getWriter().write("{\"error\":\"Rate limit exceeded\"}");
            return;
        }
        
        entry.count++;
        filterChain.doFilter(request, response);
    }
    
    private String getClientIp(HttpServletRequest request) {
        String xForwardedFor = request.getHeader("X-Forwarded-For");
        if (xForwardedFor != null && !xForwardedFor.isEmpty()) {
            return xForwardedFor.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }
    
    private static class RateLimitEntry {
        int count;
        long resetTime;
        
        RateLimitEntry(int count, long resetTime) {
            this.count = count;
            this.resetTime = resetTime;
        }
    }
}
